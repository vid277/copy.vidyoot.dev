declare module "quilljs-markdown" {
  interface Quill {
    getContents(): any;
    setContents(contents: any): void;
    getText(): string;
    setText(text: string): void;
  }

  export default class QuillMarkdown {
    constructor(quill: Quill);
    destroy(): void;
  }
}
