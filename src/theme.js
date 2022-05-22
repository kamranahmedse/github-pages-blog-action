const fs = require("fs");
const fsExtra = require('fs-extra');
const path = require("path");
const fm = require("front-matter");
const showdown = require("showdown");
const slugify = require('slugify');
const dayjs = require('dayjs');
const ejs = require('ejs');

const htmlConverter = new showdown.Converter();

const outputDir = path.join(__dirname, '../output');
const contentDir = path.join(__dirname, '../content');
const siteConfig = require(path.join(__dirname, '../content/site.json'));

const postsDir = path.join(contentDir, './posts');
const themePath = path.join(__dirname, '../theme');

// Remove and recreate the output directory
fsExtra.removeSync(outputDir);
fsExtra.ensureDirSync(outputDir);

async function prepareThemeFiles() {
    const nonPageFiles = fs.readdirSync(themePath)
        .filter(file => !file.endsWith('.ejs') && !file.startsWith('_'));

    nonPageFiles.forEach(nonPageFileName => {
        const nonPageFilePath = path.join(themePath, nonPageFileName);
        const outputPath = path.join(outputDir, nonPageFileName);

        fsExtra.copySync(nonPageFilePath, outputPath);
    });

    if (siteConfig.cname) {
        fs.writeFileSync(path.join(outputDir, 'CNAME'), siteConfig.cname);
    }
}

async function prepareBlogPosts() {
    const postFiles = fs.readdirSync(postsDir);
    const posts = [];

    for (let contentFile of postFiles) {
        const contentFilePath = path.join(postsDir, contentFile);
        const content = fs.readFileSync(contentFilePath, 'utf-8');
        const parsed = fm(content);

        let {title, date, permalink, externalUrl} = parsed.attributes;

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
            externalUrl,
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

async function prepareHome(posts) {
    posts.sort((a, b) => dayjs(b.date).date() - dayjs(a.date).date());

    const groupedPosts = posts.reduce((aggMap, postItem) => {
        const year = dayjs(postItem.date).format('YYYY');

        aggMap.set(year, [
            ...aggMap.get(year) || [],
            postItem,
        ]);

        return aggMap;
    }, new Map());

    const homeHtml = await ejs.renderFile(path.join(themePath, 'index.ejs'), {
        siteConfig,
        groupedPosts,
    });

    fs.writeFileSync(path.join(outputDir, 'index.html'), homeHtml);
}

async function copyStaticAssets() {
    const staticAssetsPath = path.join(contentDir, 'static');
    fsExtra.copySync(staticAssetsPath, outputDir);
}

async function main() {
    await prepareThemeFiles();
    await prepareAbout();
    const posts = await prepareBlogPosts();
    await prepareHome(posts);
    await copyStaticAssets();
}

main();


