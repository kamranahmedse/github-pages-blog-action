const fs = require("fs");
const fsExtra = require('fs-extra');
const path = require("path");
const fm = require("front-matter");
const showdown = require("showdown");
const slugify = require('slugify');
const dayjs = require('dayjs');

const outputDir = path.join(__dirname, './output');
const contentDir = path.join(__dirname, './content/posts');
const themePath = path.join(__dirname, './themes/whitey');

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
            .replace('=site.title=', siteConfig.title)
            .replace('=site.subtitle=', siteConfig.subtitle)
            .replace('=github=', siteConfig.social?.github)
            .replace('=twitter=', siteConfig.social?.twitter)
            .replace('=owner.email=', siteConfig.owner?.email)
            .replace('=owner.name=', siteConfig.owner?.name);

        const outputFilePath = path.join(outputDir, themeFileName);

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

prepareTheme();

const contentFiles = fs.readdirSync(contentDir);
const postTemplate = fs.readFileSync(path.join(outputDir, 'post.html'), 'utf-8');

contentFiles.forEach(contentFile => {
    const contentFilePath = path.join(contentDir, contentFile);

    // Extracts the front-matter
    const content = fs.readFileSync(contentFilePath, 'utf-8');
    const parsed = fm(content);

    let {title, date, permalink, author} = parsed.attributes;

    if (!date) {
        date = dayjs().format('ddd, MMMM DD, YYYY');
    } else {
        date = dayjs(date).format('ddd, MMMM DD, YYYY')
    }

    // Converts the markdown file to HTML
    const htmlConverter = new showdown.Converter();
    const html = htmlConverter.makeHtml(parsed.body);

    const populatedTemplate = postTemplate
        .replace('=date=', date)
        .replace('=title=', title)
        .replace('=body=', html);

    const fullFileName = (permalink || slugify(title).toLowerCase()).replace(/^\//, '');
    const fullFileNameParts = fullFileName.split('/');
    const fileName = fullFileNameParts.pop();

    const nestedPostDir = fullFileNameParts.join('/');
    if (nestedPostDir) {
        fsExtra.ensureDirSync(path.join(outputDir, nestedPostDir));
    }

    fsExtra.writeFileSync(path.join(outputDir, nestedPostDir, `${fileName}.html`), populatedTemplate);
});



