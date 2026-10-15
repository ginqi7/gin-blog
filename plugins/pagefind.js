import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);

// 站内搜索。构建完成后给 _site 里所有 HTML 建一份全文索引，产物写在
// _site/pagefind/，页面那边由 _includes/base-layout.njk 加载。
//
// 为什么挂在 eleventy.after：索引必须针对最终 HTML，而 _site 里的文件是在
// 构建过程中才写出来的。跟 minify-css、subset-font 同一个钩子。
//
// 用命令行而不是 pagefind 的 Node API —— 这不是偏好，是 API 有问题。
// Node API 的 writeFiles() 只会正确写出索引分片（fragment/、index/），
// 而 pagefind.js、pagefind-entry.json、pagefind-component-ui.css 这些前端
// 资源全都写成 0 字节。看起来是 writeFiles 在服务进程把资源刷完之前就返回了，
// 紧接着的 close() 把没写完的部分截断。拿同样的 _site 跑一遍命令行，
// 这些文件分别是 45555 / 186 / 41830 字节，索引部分逐字节一致。
// 想改回 Node API 之前，先确认那些文件不再是空的。
//
// 中文能搜是靠两件事，缺一不可，改之前先确认：
//   1. 这个 npm 包装到的是 extended 版（只有它做中日文分词）。实测
//      node_modules/@pagefind/darwin-arm64/bin/ 里唯一的可执行文件就是
//      pagefind_extended，标准版只留了个校验和文件，没发二进制。
//   2. 每页的 <html lang> 得是 zh-CN。Pagefind 按它决定用哪种语言分词，
//      为空就归到 "unknown"，整句无空格的中文会变成一个巨型 token，
//      搜「马车」也搜不到。这个属性以前一直是空的（见 base-layout.njk）。
//
// 不传 --force-language：语言是按页判定的，写死会把英文的 blog 仓库也当中文索引。
// 子路径部署（qiqijin.com/zh-blog/）跟这里无关，那是浏览器端 base-url 的事。
export default function (eleventyConfig) {
  eleventyConfig.on("eleventy.after", async () => {
    // npm 把 bin 软链到这里。用 .bin 而不是 node_modules/pagefind/lib/... ，
    // 是因为前者是 npm 承诺的接口，后者是包内部布局，升级就变。
    const bin = path.resolve("node_modules", ".bin", "pagefind");
    if (!fs.existsSync(bin)) {
      console.warn("[pagefind] 找不到 pagefind 可执行文件，本次站点不带搜索");
      return;
    }

    try {
      const { stdout } = await run(bin, [
        "--site",
        "_site",
        "--output-path",
        "_site/pagefind",
      ]);

      // 命令行输出里就一行结果摘要，取出来记一条，比整个 stdout 刷屏清楚。
      const summary = stdout
        .split("\n")
        .map((line) => line.trim())
        .find((line) => /^Indexed \d+ pages?$/.test(line));
      console.log(`[pagefind] ${summary ?? "done"} -> _site/pagefind/`);
    } catch (err) {
      // 建索引失败就这次不带搜索，站点其余部分照常可用。绝不能因为搜索
      // 把整个部署卡住——跟 subset-font.js 一个原则。
      // pagefind 失败时摘要走 stdout，报错走 stderr，两个都打出来才好查。
      console.error(`[pagefind] 建索引失败，本次站点不带搜索：${err.message}`);
      if (err.stdout) console.error(String(err.stdout).trim());
      if (err.stderr) console.error(String(err.stderr).trim());
    }
  });
}
