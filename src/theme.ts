import ejs from 'ejs';
import dayjs from 'dayjs';
import slugify from 'slugify';
import showdown from 'showdown';
import fm, { FrontMatterResult } from 'front-matter';
import path from 'path';
import fsExtra from 'fs-extra';
import fs from 'fs';
import { info } from '@actions/core';
import { ConfigurationType } from './git';

type FrontMatterType = {
  title: string;
  date: string;
  permalink: string;
  externalUrl: string;
};

type PostType = {
  title: string;
  date: string;
  permalink: string;
  externalUrl: string;
  html: string;
};

type SiteConfigType = {
  title: string;
  subtitle: string;
  baseUrl: string;
  owner: {
    name: string;
    email: string;
  };
  social: {
    github: string;
    twitter: string;
    medium: string;
  };
  newsletter: {
    currentCount: string;
    revueUsername: string;
  };
  seo: {
    title: string;
    description: string;
    author: string;
    keywords: string[];
  };
  cname: string;
};

const htmlConverter = new showdown.Converter();

export async function prepareTheme(configuration: ConfigurationType) {
  const outputDir = configuration.outputDir;
  const repoPath = configuration.repoPath;

  const siteConfig: SiteConfigType = require(path.join(configuration.repoPath, './site.json'));
  const postsDir = path.join(configuration.repoPath, './posts');
  const themePath = path.join(__dirname, '../theme');

  async function prepareThemeFiles() {
    info('Preparing theme files');
    const nonPageFiles = fs
      .readdirSync(themePath)
      .filter(file => !file.endsWith('.ejs') && !file.startsWith('_'));

    nonPageFiles.forEach(nonPageFileName => {
      const nonPageFilePath = path.join(themePath, nonPageFileName);
      const outputPath = path.join(outputDir, nonPageFileName);

      fsExtra.copySync(nonPageFilePath, outputPath);
    });

    if (siteConfig.cname) {
      fs.writeFileSync(path.join(outputDir, 'CNAME'), siteConfig.cname);
    }

    // Create the file to bypass jekyll execution by github pages
    fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');
  }

  async function prepareBlogPosts() {
    info('Preparing blog posts');
    const postFiles = fs.readdirSync(postsDir);
    const posts = [];

    for (let contentFile of postFiles) {
      const contentFilePath = path.join(postsDir, contentFile);
      const content = fs.readFileSync(contentFilePath, 'utf-8');
      const parsed = fm(content) as FrontMatterResult<FrontMatterType>;

      let { title, date, permalink, externalUrl } = parsed.attributes;

      if (!date) {
        date = dayjs().format('ddd, MMMM DD, YYYY');
      } else {
        date = dayjs(date).format('ddd, MMMM DD, YYYY');
      }

      const postHtml = htmlConverter.makeHtml(parsed.body);

      const fullFileName = (permalink || slugify(title).toLowerCase()).replace(/^\//, '');
      const fullFileNameParts = fullFileName.split('/');
      const fileName = fullFileNameParts.pop() || '';

      const nestedPostDir = fullFileNameParts.join('/');
      if (nestedPostDir) {
        fsExtra.ensureDirSync(path.join(outputDir, nestedPostDir));
      }

      const postMeta = {
        title,
        date,
        permalink: path.join('/', nestedPostDir, fileName),
        externalUrl,
        html: postHtml
      };

      const postFileTemplate = path.join(themePath, 'post.ejs');
      const populatedTemplate = await ejs.renderFile(postFileTemplate, {
        post: postMeta,
        siteConfig
      });

      fs.writeFileSync(path.join(outputDir, nestedPostDir, `${fileName}.html`), populatedTemplate);

      posts.push(postMeta);
    }

    return posts;
  }

  async function prepareAbout() {
    info('Preparing about page');
    const aboutContent = fs.readFileSync(path.join(repoPath, 'about.md'), 'utf-8');
    const html = htmlConverter.makeHtml(aboutContent);

    const populatedTemplate = await ejs.renderFile(path.join(themePath, 'about.ejs'), {
      siteConfig,
      html
    });

    fs.writeFileSync(path.join(outputDir, 'about.html'), populatedTemplate);
  }

  async function prepareHome(posts: PostType[]) {
    info('Preparing homepage');
    posts.sort((a, b) => dayjs(b.date).date() - dayjs(a.date).date());

    const groupedPosts = posts.reduce((aggMap, postItem) => {
      const year = dayjs(postItem.date).format('YYYY');

      aggMap.set(year, [...(aggMap.get(year) || []), postItem]);

      return aggMap;
    }, new Map());

    const homeHtml = await ejs.renderFile(path.join(themePath, 'index.ejs'), {
      siteConfig,
      groupedPosts
    });

    fs.writeFileSync(path.join(outputDir, 'index.html'), homeHtml);
  }

  async function copyStaticAssets() {
    info('Copying static assets');
    const staticAssetsPath = path.join(repoPath, 'static');
    fsExtra.copySync(staticAssetsPath, outputDir);
  }

  // Remove and recreate the output directory
  fsExtra.removeSync(configuration.outputDir);
  fsExtra.ensureDirSync(configuration.outputDir);

  await prepareThemeFiles();
  await prepareAbout();
  const posts = await prepareBlogPosts();
  await prepareHome(posts);
  await copyStaticAssets();
}
