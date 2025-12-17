// components/RichTextEditor.tsx
import React, { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import styles from "../styles/RichTextEditor.module.css";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

const MenuBar = ({ editor }: { editor: ReturnType<typeof useEditor> }) => {
  if (!editor) return null;

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  return (
    <div className={styles.menuBar}>
      <div className={styles.menuGroup}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${styles.menuButton} ${editor.isActive("bold") ? styles.active : ""}`}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${styles.menuButton} ${editor.isActive("italic") ? styles.active : ""}`}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${styles.menuButton} ${editor.isActive("underline") ? styles.active : ""}`}
          title="Underline"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${styles.menuButton} ${editor.isActive("strike") ? styles.active : ""}`}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`${styles.menuButton} ${editor.isActive("highlight") ? styles.active : ""}`}
          title="Highlight"
        >
          <span className={styles.highlightIcon}>H</span>
        </button>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`${styles.menuButton} ${editor.isActive("heading", { level: 1 }) ? styles.active : ""}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${styles.menuButton} ${editor.isActive("heading", { level: 2 }) ? styles.active : ""}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${styles.menuButton} ${editor.isActive("heading", { level: 3 }) ? styles.active : ""}`}
          title="Heading 3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`${styles.menuButton} ${editor.isActive("paragraph") ? styles.active : ""}`}
          title="Paragraph"
        >
          P
        </button>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${styles.menuButton} ${editor.isActive("bulletList") ? styles.active : ""}`}
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${styles.menuButton} ${editor.isActive("orderedList") ? styles.active : ""}`}
          title="Numbered List"
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${styles.menuButton} ${editor.isActive("blockquote") ? styles.active : ""}`}
          title="Quote"
        >
          &quot;
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`${styles.menuButton} ${editor.isActive("codeBlock") ? styles.active : ""}`}
          title="Code Block"
        >
          {"</>"}
        </button>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`${styles.menuButton} ${editor.isActive({ textAlign: "left" }) ? styles.active : ""}`}
          title="Align Left"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`${styles.menuButton} ${editor.isActive({ textAlign: "center" }) ? styles.active : ""}`}
          title="Align Center"
        >
          ↔
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`${styles.menuButton} ${editor.isActive({ textAlign: "right" }) ? styles.active : ""}`}
          title="Align Right"
        >
          →
        </button>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <button
          type="button"
          onClick={setLink}
          className={`${styles.menuButton} ${editor.isActive("link") ? styles.active : ""}`}
          title="Add Link"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={addImage}
          className={styles.menuButton}
          title="Add Image"
        >
          🖼
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={styles.menuButton}
          title="Horizontal Rule"
        >
          —
        </button>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={styles.menuButton}
          title="Undo"
        >
          ↩
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={styles.menuButton}
          title="Redo"
        >
          ↪
        </button>
      </div>
    </div>
  );
};

export default function RichTextEditor({
  content,
  onChange,
  onSave,
  readOnly = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "editor-link",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "editor-image",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return <div className={styles.loading}>Loading editor...</div>;
  }

  return (
    <div className={styles.editorWrapper}>
      {!readOnly && <MenuBar editor={editor} />}

      <EditorContent editor={editor} className={styles.editorContent} />

      {onSave && !readOnly && (
        <div className={styles.editorFooter}>
          <button type="button" onClick={onSave} className={styles.saveButton}>
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
