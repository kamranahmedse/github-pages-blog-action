# github-pages-blog-action
Create blog from your markdown files in GitHub / [Sample Blog](https://kamranahmed.info)

## Setting Up the Blog

Create a repository on GitHub to hold your blog content with the following directory structure:

```shell
├── about.md
├── posts
  ├── art-of-getting-better.md
  ├── behavior-of-links-created-using-javascript.md
  └── yellow-fade-technique-in-css.md
├── site.json
└── static
    ├── resume.pdf
    └── ebook.pdf
```

### About Page
`about.md` is the markdown file containing the content for your about page.

### Blog Posts
`posts/` is the directory containing all your blog posts in markdown format. It supports the following frontmatter on top of each of the blog post

```shell
---
title: Your Personal Blog on GitHub Pages
date: 2022-05-25
permalink: /personal-blog-ghpages
---

Content for your bog post
```

Where `title` is the blog post title shown on the homepage as well as on the post detail page. `date` is the blog post date. `permalink` is the optional parameter to let you override the slug of the blog post.

### Site Configuration

`site.json` contains the configuration to setup the blog. Given below is the sample JSON configuration.

```json
{
  "title": "Kamran Ahmed",
  "subtitle": "Lead engineer at Zalando — tech guy with an entrepreneurial spirit and knack for getting things done",
  "owner": {
    "name": "Kamran Ahmed",
    "email": "kamranahmed.se@gmail.com"
  },
  "social": {
    "github": "kamranahmedse",
    "medium": "kamranahmedse",
    "twitter": "kamranahmedse"
  },
  "newsletter": {
    "currentCount": "2,000",
    "revueUsername": "roadmapsh"
  },
  "seo": {
    "title": "Kamran Ahmed",
    "description": "Blog of a Software Engineer",
    "author": "Kamran Ahmed",
    "keywords": [
      "blog",
      "developer blog",
      "engineering blog"
    ]
  },
  "cname": "kamranahmed.info"
}
```

For the `newsletter`, you can remove the object if you don't have [revue newsletter](https://www.getrevue.co/). And `cname` is your personal domain if applicable.

### Static Assets

The contents of the `static` folder will simply be copied at the root of your blog and will be accessible via `http://[blogurl]/filename`

## Setting Up GitHub Action

Once you have the blog repository setup, you need to setup the GitHub action in your repository. Create the action file at `.github/workflows/deploy.yml` with the following content

```yaml
name: Build and Deploy
on: [push]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout 🛎️
        uses: actions/checkout@v3

      - name: Deploy 
        uses: kamranahmedse/github-pages-blog-action@master
        with:
          branch: gh-pages # Optional branch for GitHub Pages
```
