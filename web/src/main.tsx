import React from 'react'
import ReactDOM from 'react-dom/client'
import {createHashRouter, RouterProvider,} from "react-router-dom";
import Root from "./routes/root.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import LogsPage from "./pages/LogsPage.tsx";
import OpenMowerPage from "./pages/OpenMowerPage.tsx";
import MapPage from "./pages/MapPage.tsx";
import SetupPage from "./pages/SetupPage.tsx";
import {App, Row, Spin} from "antd";
import {MowerStatus} from "./components/MowerStatus.tsx";

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
      <App style={{height: "100%"}}>
          <Row
              style={{height: '25px', borderBottom: '1px solid #1677ff', position: "absolute", top: 0, right: 0, zIndex: 100, marginLeft: 50, paddingRight: 10, paddingTop: 2}}>
              <MowerStatus/>
          </Row>
          <React.Suspense fallback={<Spin/>}>
              <RouterProvider router={router}/>
          </React.Suspense>
      </App>
  </React.StrictMode>,
)
