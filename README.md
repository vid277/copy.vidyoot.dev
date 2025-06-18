## copy.vidyoot.dev

Simple pastebin clone built using Rust (actix-web, diesel, postgresql) and React. Enter a url, type in text, hit send, and share the link with friends to view your notes anywhere.

Todo:

- Return appropriate error for searching if a certain url exists
- Create custom times that the notes should exist
  - Start a tokio thread and run a loop
- Use caddy to host with hetzner
