import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import MyLogsPage from "./pages/MyLogsPage";
import TimelinePage from "./pages/TimelinePage";
import RecordDetailPage from "./pages/RecordDetailPage";
import NotFoundPage from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <MyLogsPage />,
      },
      {
        path: "timeline",
        element: <TimelinePage />,
      },
      {
        path: "records/:recordId",
        element: <RecordDetailPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
