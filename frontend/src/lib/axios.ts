import axios from "axios";
import { API_BASE_URL } from "../constants/api";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
