import project from "./project.js";

export default function () {
  return [
    {
      type: "github",
      src: "/static/svg/github.svg",
      href: project().github,
      show: "(Github)",
      position: "footer",
    },
    {
      type: "email",
      src: "/static/svg/mail.svg",
      href: "mailto:" + project().mail,
      show: "(Email)",
      position: "footer",
    },
    {
      type: "rss",
      src: "/static/svg/rss.svg",
      // 直接指向构建出来的 /feed.xml，不经过任何跳转——阅读器拿到的是 feed 本身
      href: "/feed.xml",
      show: "(RSS)",
      position: "footer",
    },
  ];
}
