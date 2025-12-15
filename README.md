[Eleventy](https://github.com/11ty/eleventy) is a simpler static site generator.

This project is an Eleventy template for creating a simple personal blog.

1. Simple and clean web pages.
2. Provide acceptable performace.
3. Support Markdown, Org-mode.

## Demo

## Getting Started

### 2. Clone the repository

```
git clone https://github.com/ginqi7/gin-blog
```

### 3. Navigate to the directory

```
cd gin-blog
```

### Install dependencies

```
npm install
```

### Run Eleventy

Generate a production-ready build to the `_site` folder:

```
npx @11ty/eleventy
```

Or build and host on a local development server:

```
npx @11ty/eleventy --serve
```

## Docker

By utilizing the Docker image, you can write books without needing the gin-blog directory.

### Build

```
 git clone https://github.com/ginqi7/gin-blog.git gin-blog
 cd gin-blog
 docker build -t gin-blog .
```

### Start Serve

In your books directory:

```
docker run -p 8080:8080 -v $(pwd):/app/posts gin-blog
```

### Start export

In your books directory:

```
docker run -v $(pwd):/app/posts -v $(pwd)/_site:/app/_site gin-blog npx eleventy
```

### Utilizing the Docker Image in GHCR.

In your books directory:

```
docker run -p 8080:8080 -v $(pwd):/app/posts  ghcr.io/ginqi7/gin-blog
```

or

```
docker run -v $(pwd):/app/posts -v $(pwd)/_site:/app/_site  ghcr.io/ginqi7/gin-blog npx eleventy
```

## Github Page

You can easily publish your books on GitHub Pages:

1. Create a repository that contains your books written in Markdown files.
2. Create a GitHub Action to build the website (similar to [this](https://github.com/ginqi7/blog/blob/main/.github/workflows/publish.yml)).
3. Every time you push your books to the master branch, it will deploy a GitHub page. You can refer to [my books repository](https://github.com/ginqi7/blog).
