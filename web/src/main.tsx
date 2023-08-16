import React from 'react'
import ReactDOM from 'react-dom/client'
import {createHashRouter, RouterProvider,} from "react-router-dom";
import Root from "./routes/root.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import LogsPage from "./pages/LogsPage.tsx";
import OpenMowerPage from "./pages/OpenMowerPage.tsx";
import MapPage from "./pages/MapPage.tsx";
import SetupPage from "./pages/SetupPage.tsx";

const router = createHashRouter([
    {
        path: "/",
        element: <Root/>,
        children: [
            {
                element: <SettingsPage/>,
                path: "/settings",
            },
            {
                element: <LogsPage/>,
                path: "/logs",
            },
            {
                element: <OpenMowerPage/>,
                path: "/openmower",
            },
            {
                element: <MapPage/>,
                path: "/map",
            },
            {
                element: <SetupPage/>,
                path: "/setup",
            }
        ]
    },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <RouterProvider router={router} />
  </React.StrictMode>,
)
