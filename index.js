const fs = require("fs");
const fsExtra = require('fs-extra');
const path = require("path");
const fm = require("front-matter");
const showdown = require("showdown");
const slugify = require('slugify');
const dayjs = require('dayjs');

const htmlConverter = new showdown.Converter();

const outputDir = path.join(__dirname, './output');

const contentDir = path.join(__dirname, './content');
const postsDir = path.join(contentDir, './posts');

const themePath = path.join(__dirname, './theme');

const siteConfig = require(path.join(__dirname, './content/site.json'));

// Remove and recreate the output directory
fsExtra.removeSync(outputDir);
fsExtra.ensureDirSync(outputDir);

function prepareTheme() {
    const themePageFiles = fs.readdirSync(themePath).filter(file => file.endsWith('.html'));

    // Prepare and place the theme pages
    themePageFiles.forEach(themeFileName => {
        const themeFilePath = path.join(themePath, themeFileName);
        let fileContent = fs.readFileSync(themeFilePath, 'utf-8');

        // Replace partials with actual partial content
        const matches = fileContent.match(/=include\(.+?\)=/g);
        matches.forEach(match => {
            const partialName = match.replace(/=include\((.+?)\)=/, '$1');
            const partialPath = path.join(themePath, '_includes', partialName);

            const partialContent = fs.readFileSync(partialPath, 'utf-8');

            fileContent = fileContent.replace(match, partialContent);
        });

        fileContent = fileContent
            .replace(/=site.title=/g, siteConfig.title)
            .replace(/=site.subtitle=/g, siteConfig.subtitle || '')
            .replace(/=github=/g, siteConfig.social?.github)
            .replace(/=twitter=/g, siteConfig.social?.twitter)
            .replace(/=medium=/g, siteConfig.social?.medium)
            .replace(/=owner.email=/g, siteConfig.owner?.email)
            .replace(/=owner.name=/g, siteConfig.owner?.name)
            .replace(/=seo.title=/g, siteConfig.seo?.title)
            .replace(/=seo.description=/g, siteConfig.seo?.description)
            .replace(/=seo.keywords=/g, siteConfig.seo?.keywords?.join(','))
            .replace(/=currentYear=/g, dayjs().format('YYYY'));

        const outputFilePath = path.join(outputDir, themeFileName);

        const revueUsername = siteConfig.newsletter?.revueUsername;
        if (revueUsername) {
            fileContent = fileContent
                .replace(/=newsletter.revueUsername=/g, revueUsername)
                .replace(/=newsletter.currentCount=/g, siteConfig.newsletter?.currentCount);
        } else {
            // Hide the newsletter
            fileContent = fileContent.replace(/=newsletter=/g, 'none');
        }

        fs.writeFileSync(outputFilePath, fileContent);
    });

    // Prepare the non-page files
    const nonPageFiles = fs.readdirSync(themePath).filter(file => !file.endsWith('.html') && !file.startsWith('_'));

    nonPageFiles.forEach(nonPageFileName => {
        const nonPageFilePath = path.join(themePath, nonPageFileName);
        const outputPath = path.join(outputDir, nonPageFileName);

        fsExtra.copySync(nonPageFilePath, outputPath);
    });
}

function preparePosts() {
    const postTemplatePath = path.join(outputDir, 'post.html');

    const postFiles = fs.readdirSync(postsDir);
    const postTemplate = fs.readFileSync(postTemplatePath, 'utf-8');

    postFiles.forEach(contentFile => {
        const contentFilePath = path.join(postsDir, contentFile);

        // Extracts the front-matter
        const content = fs.readFileSync(contentFilePath, 'utf-8');
        const parsed = fm(content);

        let {title, date, permalink, author} = parsed.attributes;

        if (!date) {
            date = dayjs().format('ddd, MMMM DD, YYYY');
        } else {
            date = dayjs(date).format('ddd, MMMM DD, YYYY')
        }

        const html = htmlConverter.makeHtml(parsed.body);

        const populatedTemplate = postTemplate
            .replace(/=date=/g, date)
            .replace(/=title=/g, title)
            .replace(/=body=/g, html)
            .replace(/(<title>).+?(<\/title>)/, `$1${title}$2`);

        const fullFileName = (permalink || slugify(title).toLowerCase()).replace(/^\//, '');
        const fullFileNameParts = fullFileName.split('/');
        const fileName = fullFileNameParts.pop();

        const nestedPostDir = fullFileNameParts.join('/');
        if (nestedPostDir) {
            fsExtra.ensureDirSync(path.join(outputDir, nestedPostDir));
        }

        fs.writeFileSync(path.join(outputDir, nestedPostDir, `${fileName}.html`), populatedTemplate);
    });
}

function prepareAbout() {
    const aboutTemplatePath = path.join(outputDir, 'about.html');

    const aboutContent = fs.readFileSync(path.join(contentDir, 'about.md'), 'utf-8');
    const aboutHtml = htmlConverter.makeHtml(aboutContent);

    const aboutFileContent = fs
        .readFileSync(aboutTemplatePath, 'utf-8')
        .replace('=about=', aboutHtml)
        .replace(/=site.title=/g, siteConfig.title)
        .replace(/=site.subtitle=/g, siteConfig.subtitle || '')
        .replace(/=github=/g, siteConfig.social?.github)
        .replace(/=twitter=/g, siteConfig.social?.twitter)
        .replace(/=medium=/g, siteConfig.social?.medium)
        .replace(/=owner.email=/g, siteConfig.owner?.email)
        .replace(/=owner.name=/g, siteConfig.owner?.name);

    fs.writeFileSync(aboutTemplatePath, aboutFileContent);
}

function cleanup() {
    // delete the posts template file
    fs.rmSync(path.join(outputDir, 'post.html'));
}

prepareTheme();
preparePosts();
prepareAbout();
cleanup();



