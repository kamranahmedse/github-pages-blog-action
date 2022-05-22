const fs = require("fs");
const fsExtra = require('fs-extra');
const path = require("path");
const fm = require("front-matter");
const showdown = require("showdown");
const slugify = require('slugify');
const dayjs = require('dayjs');

const ejs = require('ejs');

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

async function copyStaticFiles() {
    // Prepare the non-page files
    const nonPageFiles = fs.readdirSync(themePath)
        .filter(file => !file.endsWith('.ejs') && !file.startsWith('_'));

    nonPageFiles.forEach(nonPageFileName => {
        const nonPageFilePath = path.join(themePath, nonPageFileName);
        const outputPath = path.join(outputDir, nonPageFileName);

        fsExtra.copySync(nonPageFilePath, outputPath);
    });
}

async function prepareBlogPosts() {
    const postFiles = fs.readdirSync(postsDir);
    const posts = [];

    for (let contentFile of postFiles) {
        const contentFilePath = path.join(postsDir, contentFile);
        const content = fs.readFileSync(contentFilePath, 'utf-8');
        const parsed = fm(content);

        let {title, date, permalink, author} = parsed.attributes;

        if (!date) {
            date = dayjs().format('ddd, MMMM DD, YYYY');
        } else {
            date = dayjs(date).format('ddd, MMMM DD, YYYY')
        }

        const postHtml = htmlConverter.makeHtml(parsed.body);

        const fullFileName = (permalink || slugify(title).toLowerCase()).replace(/^\//, '');
        const fullFileNameParts = fullFileName.split('/');
        const fileName = fullFileNameParts.pop();

        const nestedPostDir = fullFileNameParts.join('/');
        if (nestedPostDir) {
            fsExtra.ensureDirSync(path.join(outputDir, nestedPostDir));
        }

        const postMeta = {
            title,
            date,
            permalink: path.join('/', nestedPostDir, fileName),
            html: postHtml,
        };

        const postFileTemplate = path.join(themePath, 'post.ejs');
        const populatedTemplate = await ejs.renderFile(postFileTemplate, {
            post: postMeta,
            siteConfig,
        });

        fs.writeFileSync(path.join(outputDir, nestedPostDir, `${fileName}.html`), populatedTemplate)

        posts.push(postMeta);
    }

    return posts;
}

async function prepareAbout() {
    const aboutContent = fs.readFileSync(path.join(contentDir, 'about.md'), 'utf-8');
    const html = htmlConverter.makeHtml(aboutContent);

    const populatedTemplate = await ejs.renderFile(path.join(themePath, 'about.ejs'), {
        siteConfig,
        html
    });

    fs.writeFileSync(path.join(outputDir, 'about.html'), populatedTemplate);
}

function prepareHome(posts) {
    posts.sort((a, b) => dayjs(b.date).date() - dayjs(a.date).date());

    const groupedPosts = posts.reduce((aggMap, postItem) => {
        const year = dayjs(postItem.date).format('YYYY');

        aggMap.set(year, [
            ...aggMap.get(year) || [],
            postItem,
        ]);

        return aggMap;
    }, new Map());

    const homeHtml = ejs.renderFile(path.join(themePath, 'index.ejs'), {
        siteConfig,
        groupedPosts,
    });
}

async function main() {
    await copyStaticFiles();
    await prepareAbout();

    const posts = await prepareBlogPosts();

    prepareHome(posts);
}

main();

// prepareTheme();
// preparePosts();
// prepareAbout();
// cleanup();



