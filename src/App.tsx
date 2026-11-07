import { RouterProvider } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import { router } from "./router";

export default function App() {
  return (
    <DataProvider>
      <RouterProvider router={router} />
    </DataProvider>
  );
}
