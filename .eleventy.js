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

  // feed 要的绝对地址。注意 siteURL 必须由内容仓库的 _data/project.js 提供：
  // 内容仓库部署时把整个 _data 挂载覆盖掉（原因见 _includes/footer.njk），
  // 所以镜像自带那份 project.js 里的 siteURL 在线上根本不生效。
  // 缺了就退到 baseURL 并告警 —— baseURL 是路径前缀（如 "/zh-blog/"）不是绝对地址，
  // feed 里会因此出现相对 URL，阅读器解析不了。这里只告警不中断：站点本身照常可用，
  // 不该因为一个订阅文件把整个部署卡住。
  eleventyConfig.addFilter("feedBaseURL", (project) => {
    if (project?.siteURL) {
      return project.siteURL;
    }
    console.warn(
      "[feed] _data/project.js 里没有 siteURL，feed 的链接会退化成相对地址。\n" +
        '       请在内容仓库的 _data/project.js 里补上，例如 siteURL: "https://example.com/"',
    );
    return project?.baseURL || "/";
  });

  // 把站点根相对路径（Eleventy 的 post.url，形如 "/tproxy/"）拼成绝对地址。
  // 这里不能用 htmlBaseUrl：它遇到以 "/" 开头的地址会当作"从域名根开始"，
  // 而本站部署在子路径下（qiqijin.com/zh-blog/，前缀由 project.baseURL 给出），
  // 那个前缀会被丢掉，生成 https://qiqijin.com/tproxy/ 这种 404 地址。
  // 去掉开头的 "/" 再对 siteURL 做相对解析，前缀才会保留。
  // 没有可用域名时原样返回，不做解析：new URL(path, "/zh-blog/") 会抛
  // TypeError: Invalid URL，把整个构建带崩。这里的原则是"告警但继续"——
  // 宁可产出一个链接是相对地址的降级 feed，也不能让站点部署不起来。
  eleventyConfig.addFilter("feedAbsoluteUrl", (url, siteURL) => {
    const path = String(url);
    if (!/^https?:\/\//.test(String(siteURL))) {
      return path;
    }
    return new URL(path.replace(/^\//, ""), siteURL).toString();
  });

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
