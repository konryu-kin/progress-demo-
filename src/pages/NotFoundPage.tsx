import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div>
      <h1>404</h1>
      <p>ページが見つかりませんでした。</p>
      <Link to="/">ホームに戻る</Link>
    </div>
  );
}

