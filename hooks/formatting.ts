import MarkdownIt from "markdown-it";
import MarkdownItContainer from "markdown-it-container";
import Token from "markdown-it/lib/token.mjs"; // Import type nếu cần thiết

// Khởi tạo instance
const md = new MarkdownIt();

// Plugin container "scroll-step"
md.use(MarkdownItContainer, "scroll-step");

// Lưu lại renderer mặc định
// from https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer
const defaultRender =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

// Override renderer cho thẻ link_open (<a>)
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const aIndex = token.attrIndex("target");

  if (aIndex < 0) {
    // Nếu chưa có target, thêm mới
    token.attrPush(["target", "_blank"]);
  } else {
    // Nếu đã có, ghi đè thành _blank
    // @ts-ignore: attrs có thể là null theo type definition nhưng ở đây chắc chắn tồn tại
    token.attrs[aIndex][1] = "_blank";
  }

  // Thêm rel="noopener noreferrer" để bảo mật khi mở tab mới
  const relIndex = token.attrIndex("rel");
  if (relIndex < 0) {
    token.attrPush(["rel", "noopener noreferrer"]);
  } else {
    // @ts-ignore
    token.attrs[relIndex][1] = "noopener noreferrer";
  }

  // Gọi renderer mặc định
  return defaultRender(tokens, idx, options, env, self);
};

/**
 * Hàm convert Markdown string sang HTML string
 * @param text Nội dung markdown
 * @returns Chuỗi HTML
 */
export function renderMarkdown(text: string): string {
  return md.render(text);
}