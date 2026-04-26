import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../lib/api.js';
import { PageSpinner } from '../components/ui/Spinner.js';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const error = new URLSearchParams(window.location.search).get('error');

    if (error) {
      navigate(`/login?error=${error}`, { replace: true });
      return;
    }

    if (token) {
      setToken(token);
      navigate('/app/dashboard', { replace: true });
    } else {
      navigate('/login?error=no_token', { replace: true });
    }
  }, [navigate]);

  return <PageSpinner />;
}
