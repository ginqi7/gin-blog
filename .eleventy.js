import fs from "fs";
import CleanCSS from "clean-css";
import linkifyHtml from "linkify-html";
import rssPlugin from "@11ty/eleventy-plugin-rss";
import pluginOrgMode from "./plugins/org-mode.js";
import pluginDateFormat from "./plugins/date-format.js";
import abstract from "./plugins/abstract.js";
import subsetFont from "./plugins/subset-font.js";
import pluginPagefind from "./plugins/pagefind.js";

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
  // 站内搜索。要放在最后：它索引的是 _site 里最终的 HTML，跑在构建收尾。
  eleventyConfig.addPlugin(pluginPagefind);

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

  // 压缩 CSS。必须挂在 eleventy.after 上，不能像原来那样在配置阶段直接调用：
  // addPassthroughCopy("static/css/*") 是构建过程中才把源文件原样复制进
  // _site/static/css/ 的，配置阶段写出去的结果会被它整个盖回来——这正是这段
  // 代码此前一直被注释掉的原因，取消注释也不会生效。
  // 所以这里在产物目录里原地压缩刚复制过去的文件，而不是从 static/css/ 读源文件
  // 写产物目录：压缩的一定是最终真被访问的那份。
  eleventyConfig.on("eleventy.after", () => {
    const cssDir = "_site/static/css/";
    let before = 0;
    let after = 0;
    let count = 0;
    try {
      for (const file of fs.readdirSync(cssDir)) {
        if (!file.endsWith(".css")) continue;
        const source = fs.readFileSync(cssDir + file, "utf8");
        // level 1 只做安全的重写：去空白和注释、合并内容完全相同的重复规则、
        // 0px 这样的写法缩短。level 2 会重排并合并相邻规则，全站只多省 3%
        // （435 字节），不值得为这点收益去变动手写的样式。
        const result = new CleanCSS({ level: 1 }).minify(source);
        if (result.errors.length > 0) {
          throw new Error(`${file}: ${result.errors.join("; ")}`);
        }
        fs.writeFileSync(cssDir + file, result.styles);
        before += Buffer.byteLength(source);
        after += Buffer.byteLength(result.styles);
        count++;
      }
    } catch (err) {
      // 压缩失败就用未压缩的 CSS，站点照常可用；这里要是抛出去，
      // 整个部署会因为样式文件而失败。可能已经压了一部分文件，那也没关系，
      // 压缩前后的 CSS 语义相同。
      console.error(`[minify-css] 压缩失败，本次保留未压缩的 CSS：${err.message}`);
      return;
    }
    console.log(
      `[minify-css] ${count} 个文件 ${(before / 1024).toFixed(1)} KB -> ${(after / 1024).toFixed(1)} KB`,
    );
  });
}
