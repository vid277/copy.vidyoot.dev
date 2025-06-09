import { Editor } from "primereact/editor";
import { useState, useEffect } from "react";
import ParticleButton from "./submit";
import { Input } from "./ui/input";
import { Link, useNavigate } from "react-router";
import "highlight.js/styles/atom-one-dark.css";
import hljs from "highlight.js";
import { Button } from "./ui/button";

const header = (
  <span className="ql-formats">
    <select
      className="ql-header"
      style={{
        width: "120px",
      }}
    >
      <option value="1">Heading 1</option>
      <option value="2">Heading 2</option>
      <option value="3">Heading 3</option>
      <option value="4">Heading 4</option>
      <option value="">Normal</option>
    </select>
    <button className="ql-bold" />
    <button className="ql-italic" />
    <button className="ql-underline" />
    <button className="ql-strike" />
    <span
      className="ql-formats"
      style={{
        borderLeft: "1px solid #ccc",
        margin: "0 8px",
        paddingLeft: "8px",
      }}
    >
      <select className="ql-color">
        <option value="red" />
        <option value="green" />
        <option value="blue" />
        <option value="orange" />
        <option value="violet" />
        <option value="#d0d0d0" />
        <option selected />
      </select>
      <select className="ql-background">
        <option value="red" />
        <option value="green" />
        <option value="blue" />
        <option value="orange" />
        <option value="violet" />
        <option value="#d0d0d0" />
        <option selected />
      </select>
    </span>
    <span
      className="ql-formats"
      style={{
        borderLeft: "1px solid #ccc",
        margin: "0 8px",
        paddingLeft: "8px",
      }}
    >
      <button className="ql-list" value="ordered" />
      <button className="ql-list" value="bullet" />
      <button className="ql-indent" value="-1" />
      <button className="ql-indent" value="+1" />
    </span>
    <span
      className="ql-formats"
      style={{
        borderLeft: "1px solid #ccc",
        margin: "0 8px",
        paddingLeft: "8px",
      }}
    >
      <button className="ql-link" />
      <button className="ql-image" />
      <button className="ql-code-block" />
      <button className="ql-formula" />
    </span>
    <span
      className="ql-formats"
      style={{
        borderLeft: "1px solid #ccc",
        margin: "0 8px",
        paddingLeft: "8px",
      }}
    >
      <select className="ql-align">
        <option selected />
        <option value="center" />
        <option value="right" />
        <option value="justify" />
      </select>
    </span>
  </span>
);

const EditorComponent = () => {
  const [text, setText] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const navigate = useNavigate();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    // Initialize syntax highlighting
    if (typeof window !== "undefined") {
      hljs.highlightAll();
    }
  }, []);

  const sendNote = async () => {
    await fetch("http://localhost:8080/api/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: text, short_url: shortUrl }),
    });

    navigate(`/${shortUrl}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center gap-4">
        <span className="text-base font-bold">Link: </span>
        <Input
          type="text"
          className="w-1/4 border-1 border-gray-300 rounded-md active:border-gray-300"
          value={shortUrl}
          onChange={(e) => setShortUrl(e.target.value)}
        />
        {shortUrl && (
          <>
            <Link to={`/${shortUrl}`}>
              <span className="text-sm text-gray-600">
                {`http://localhost:8080/${shortUrl}`}
              </span>
            </Link>
            <Button
              onClick={() =>
                copyToClipboard(`http://localhost:8080/${shortUrl}`)
              }
              className="text-sm"
            >
              Copy Link
            </Button>
          </>
        )}
      </div>
      <Editor
        value={text}
        placeholder="Write your note here..."
        onTextChange={(e) => setText(e?.htmlValue || "")}
        headerTemplate={header}
        style={{ height: "320px" }}
      />

      <ParticleButton onSuccess={sendNote} className="particle-button">
        Submit
      </ParticleButton>
    </div>
  );
};

export default EditorComponent;
