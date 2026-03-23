// eslint-disable-next-line import/order
import './wdyr';
import React from 'react'
import ReactDOM from 'react-dom/client'
import {createHashRouter, RouterProvider,} from "react-router-dom";
import Root from "./routes/root.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import LogsPage from "./pages/LogsPage.tsx";
import OpenMowerPage from "./pages/OpenMowerPage.tsx";
import MapPage from "./pages/MapPage.tsx";
import SetupPage from "./pages/SetupPage.tsx";
import SchedulePage from "./pages/SchedulePage.tsx";
import IntegrationsPage from "./pages/IntegrationsPage.tsx";
import {App, ConfigProvider, theme} from "antd";
import {Spinner} from "./components/Spinner.tsx";
import {COLORS} from "./theme/colors.ts";

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
            },
            {
                element: <SchedulePage/>,
                path: "/schedule",
            },
            {
                element: <IntegrationsPage/>,
                path: "/integrations",
            }
        ]
    },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <ConfigProvider theme={{
          algorithm: theme.darkAlgorithm,
          token: {
              colorPrimary: COLORS.primary,
              colorBgContainer: COLORS.bgCard,
              colorBgLayout: COLORS.bgBase,
              colorBorder: COLORS.border,
              colorText: COLORS.text,
              borderRadius: 8,
          },
      }}>
          <App style={{height: "100%"}}>
              <React.Suspense fallback={<Spinner/>}>
                  <RouterProvider router={router}/>
              </React.Suspense>
          </App>
      </ConfigProvider>
  </React.StrictMode>,
)
