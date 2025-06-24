import "./App.css";
import CreateNoteComponent from "./components/createNote";
import ViewNoteComponent from "./components/viewNote";
import NotFound from "./components/NotFound";
import { createBrowserRouter, RouterProvider } from "react-router";

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <CreateNoteComponent />,
    },
    {
      path: "/404",
      element: <NotFound />,
    },
    {
      path: "/:shortUrl",
      element: <ViewNoteComponent />,
    },
    {
      path: "*",
      element: <NotFound />,
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
