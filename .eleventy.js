import fs from "fs";
import CleanCSS from "clean-css";
import linkifyHtml from "linkify-html";
import rssPlugin from "@11ty/eleventy-plugin-rss";
import pluginOrgMode from "./plugins/org-mode.js";
import pluginDateFormat from "./plugins/date-format.js";
import abstract from "./plugins/abstract.js";
import subsetFont from "./plugins/subset-font.js";

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
  eleventyConfig.addPlugin(subsetFont);

  // RSS。这里加的是 rssPlugin 而不是 feedPlugin：feedPlugin 会顺带注册一个模板，
  // 而那个模板解析相对地址的方式跟本站的 <base href="/"> 冲突（详见 feed.njk 顶部）。
  // rssPlugin 只提供过滤器（dateToRfc822、htmlBaseUrl、transformWithHtmlBase……），
  // 模板由根目录的 feed.njk 自己写，生成 /feed.xml。
  eleventyConfig.addPlugin(rssPlugin);

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
