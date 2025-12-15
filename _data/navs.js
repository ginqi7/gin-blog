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
  ];
}
