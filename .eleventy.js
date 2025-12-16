import fs from "fs";
import path from "path";
import Fontmin from "fontmin";
import CleanCSS from "clean-css";
import linkifyHtml from "linkify-html";
import replaceDoubanUrls from "html-douban-card";
import replaceBilibiliUrls from "html-bilibili-card";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import pluginOrgMode from "./plugins/org-mode.js";
import pluginDateFormat from "./plugins/date-format.js";
import abstract from "./plugins/abstract.js";

function allLinks(data) {
  return data.map((item) => {
    console.log(item.url);
    return `'${item.url}'`;
  });
}

export default function (eleventyConfig) {
  // copy static files to output directory.
  eleventyConfig.addPassthroughCopy("static/*");
  eleventyConfig.addPassthroughCopy("static/fonts/en/*");
  eleventyConfig.addPassthroughCopy("static/svg/*");
  eleventyConfig.addPassthroughCopy("static/js/*");
  eleventyConfig.addPassthroughCopy("static/css/*");
  eleventyConfig.addPassthroughCopy({"posts/images/" : "images"});

  eleventyConfig.addPlugin(pluginOrgMode);
  eleventyConfig.addPlugin(pluginDateFormat);
  eleventyConfig.addPlugin(abstract);

  eleventyConfig.addFilter("allLinks", allLinks);
  eleventyConfig.addGlobalData("layout", "post-layout");
  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByGlob(`posts/*`);
  });

  eleventyConfig.addCollection("tagsList", (collectionApi) => {
    const tagsSet = new Set();
    collectionApi.getFilteredByGlob(`posts/*`).forEach((item) => {
      if (!item.data.tags) return;
      item.data.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  });

  eleventyConfig.addFilter("linkify", function (content) {
    return linkifyHtml(content, {
      target: "_blank", // Open link in a new tab
      rel: "noopener noreferrer", // Security Settings
    });
  });

  eleventyConfig.addFilter("douban_card", async function (content) {
    return await replaceDoubanUrls(content);
  });

  eleventyConfig.addFilter("bilibili_card", async function (content) {
    return await replaceBilibiliUrls(content);
  });

  // minify css
  // minifyCss();
}

function minifyCss() {
  const sourceCssDir = "static/css/";
  const targetCssDir = "_site/static/css/";
  if (!fs.existsSync(targetCssDir)) {
    fs.mkdirSync(targetCssDir, { recursive: true });
  }
  const files = fs.readdirSync(sourceCssDir);
  files.forEach((file) => {
    var inputFile = sourceCssDir + file;
    var input = fs.readFileSync(inputFile, "utf8");
    var output = new CleanCSS().minify(input);
    fs.writeFile(targetCssDir + file, output.styles, function (err) {
      if (err) return console.log("Error minifying main.css" + err);
    });
  });
}

function readFilesInDirectory(directoryPath) {
  try {
    const files = fs.readdirSync(directoryPath);
    var content = "";
    for (let file of files) {
      const filePath = directoryPath + file;
      const data = fs.readFileSync(filePath, "utf8");
      content += data;
    }
    return content;
  } catch (err) {
    console.error("Error reading directory:", err);
  }
}

function extractChineseChars(str) {
  const regex = /[\u4E00-\u9FFF]/g;
  const chineseChars = str.match(regex);
  return chineseChars ? chineseChars.join("") : "";
}

function removeDuplicateCharacters(str) {
  return [...new Set(str)].join("");
}
