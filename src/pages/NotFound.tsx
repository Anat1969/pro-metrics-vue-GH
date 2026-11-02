import { Link } from 'react-router-dom';
import TopBar from '@/components/TopBar';

const NotFound = () => (
  <div className="app-shell">
    <TopBar menuItems={[]} />
    <main className="empty" style={{ placeSelf: 'center', textAlign: 'center' }}>
      <p><b>הדף הזה לא קיים.</b></p>
      <p>ייתכן שהקישור ישן. כל הפרויקטים נמצאים בדף הבית.</p>
      <p style={{ marginTop: 12 }}><Link className="press btn btn-solid" to="/">לדף הבית</Link></p>
    </main>
  </div>
);

export default NotFound;
