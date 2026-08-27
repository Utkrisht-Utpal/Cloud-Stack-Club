export const outsideBlockAccess = () => {
  [...document.body.children].forEach((el) => {
    if (el.id != "modal") {
      el.setAttribute("aria-hidden", "true");
      el.setAttribute("inert", "true");
    }
  });
};

export const restoreOutsideAccess = () => {
  [...document.body.children].forEach((el) => {
    if (el.id !== "modal") {
      el.removeAttribute("aria-hidden");
      el.removeAttribute("inert");
    }
  });
};
