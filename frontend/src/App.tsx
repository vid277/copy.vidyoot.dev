import "./App.css";
import CreateNoteComponent from "./components/createNote";
import ViewNoteComponent from "./components/viewNote";
import { createBrowserRouter, RouterProvider } from "react-router";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <CreateNoteComponent />,
    },
    {
      path: "/:shortUrl",
      element: <ViewNoteComponent />,
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
