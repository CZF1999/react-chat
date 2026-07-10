import { createRoot } from "react-dom/client";
import router from "@/router/index";
import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@/store/index";
import "./index.less";
createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <RouterProvider router={router} />,
  </Provider>,
);
