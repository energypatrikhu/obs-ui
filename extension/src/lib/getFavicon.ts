export function getFavicon() {
  const icons: Array<HTMLLinkElement> = Array.from(document.querySelectorAll('link[rel="icon"]'));

  const iconsFiltered = icons.filter((icon) => icon.href.includes("favicon"));

  const iconsMapped = iconsFiltered.map((icon) => ({
    href: icon.href,
    sizes: icon.getAttribute("sizes")
      ? icon.getAttribute("sizes")!.includes("x")
        ? Math.max(
            ...icon
              .getAttribute("sizes")!
              .split("x")
              .map((num) => parseInt(num)),
          )
        : parseInt(icon.getAttribute("sizes")!)
      : 0,
  }));

  const iconsSorted = iconsMapped.sort((a, b) => b.sizes - a.sizes);

  return iconsSorted[0].href || "";
}
