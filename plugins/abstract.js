import * as cheerio from "cheerio";

// 取正文开头的一段，用来当首页卡片的摘要。
// 若一篇里一个 <p> 都没有（Emacs Packages 那篇正文全是标题和列表），返回空串，
// 由模板决定不渲染摘要块——不要退而取标题或列表项凑数，那些凑出来的
// "Edit Mode"、"eaf-pdf-viewer" 比没有更糟。
function getFirstNParagraphs(html, n) {
  const $ = cheerio.load(html);
  const result = [];
  $("p")
    .slice(0, n)
    .each((_index, element) => {
      const text = $(element).text().trim();
      if (text) result.push(text);
    });
  return result.join(" ");
}

export default function (eleventyConfig) {
  // 返回字符串而不是数组。以前返回 Array，只是碰巧靠 Array.toString() 把单个元素
  // 拼成了文本；一旦 n > 1 就会变成用逗号连起来的一句话。
  eleventyConfig.addFilter("abstract", (data) => getFirstNParagraphs(data, 1));
}
