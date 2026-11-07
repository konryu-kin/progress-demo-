import React from "react";
import { Link } from "react-router-dom";
import type { RecordItem } from "@/types";
import { useData } from "@/context/DataContext";
import { formatMinutes } from "@/lib/utils";

interface RecordCardProps {
  record: RecordItem;
}

export const RecordCard: React.FC<RecordCardProps> = ({ record }) => {
  const { getRecordStats } = useData();
  const stats = getRecordStats(record.id);

  const bgStyle = record.coverImageUrl
    ? { backgroundImage: `url(${record.coverImageUrl})` }
    : { backgroundColor: "#94a3b8" };

  return (
    <Link to={`/records/${record.id}`} className="record-card" style={bgStyle}>
      <h2 className="record-card-title">{record.title}</h2>
      <div className="record-card-badge">
        day {stats.currentDay} · post {stats.postCount} · {formatMinutes(stats.totalMinutes)}
      </div>
    </Link>
  );
};
