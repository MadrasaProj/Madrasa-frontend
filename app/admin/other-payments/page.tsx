import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function OtherPaymentsRedirect() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    // Handle both /admin/other-payments and /m/:slug/admin/other-payments
    const target = pathname.replace("/other-payments", "/fees");
    navigate(target, { replace: true });
  }, [navigate, pathname]);
  return null;
}
