import axios from "axios";
// application/x-www-form-urlencoded;charset=utf-8
const HeadersContentType = {
  urlencoded: "application/x-www-form-urlencoded;charset=utf-8",
  json: "application/json;charset=utf-8",
  multipart: "multipart/form-data"
}
const request = axios.create({
  baseURL: "http://192.168.1.36:10018/jat-case-server",
  timeout: 5000,
});
// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    config.headers.Authorization = `${token}`
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export  { request, HeadersContentType};