import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getStoredToken, getStoredUser } from "../../utils/authSession";

const getDefaultRoute = (accountType) => {
  switch (accountType) {
    case "admin":
    case "superadmin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "student":
      return "/home";
    default:
      return "/";
  }
};

export const RequireAuth = ({ allowedRoles = [], children }) => {
  const location = useLocation();
  const authState = useSelector((state) => state.auth);
  const token = authState.token || getStoredToken();
  const user = authState.user || getStoredUser();
  const accountType = user?.accountType;

  if (!token || !user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(accountType)) {
    return <Navigate to={getDefaultRoute(accountType)} replace />;
  }

  return children;
};

export const PublicOnlyRoute = ({ children }) => {
  const authState = useSelector((state) => state.auth);
  const token = authState.token || getStoredToken();
  const user = authState.user || getStoredUser();

  if (token && user) {
    return <Navigate to={getDefaultRoute(user.accountType)} replace />;
  }

  return children;
};
