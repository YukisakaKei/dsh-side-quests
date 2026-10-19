# Changelog

## 0.1.0 - 2026-10-19

- 首次实现：右侧栏 `.tcl` 预览提供「复制全文」按钮。
- 复制通过 `readBytes` 读取完整字节，保留末尾换行与 CRLF。
- 支持 UTF-8 / UTF-8 BOM / UTF-16 BOM，检测 NUL 字节并拒绝二进制文件。
- 复用内置 `text-pages` 分页加载与 `CodeBlock`；大文件自动关闭行号。
- 中英文案、读取状态、复制反馈与失败提示。
