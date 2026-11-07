import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import { RecordCard } from "@/features/records/components/RecordCard";
import { NewRecordCard } from "@/features/records/components/NewRecordCard";
import { CreateRecordModal } from "@/features/records/components/CreateRecordModal";

export const MyLogsPage: React.FC = () => {
  const { records } = useData();
  const [isCreateRecordOpen, setIsCreateRecordOpen] = useState(false);

  return (
    <div>
      <h1 className="page-header-title">自分のログ</h1>

      <div className="records-grid">
        {records.map((record) => (
          <RecordCard key={record.id} record={record} />
        ))}
        <NewRecordCard onClick={() => setIsCreateRecordOpen(true)} />
      </div>

      <CreateRecordModal
        isOpen={isCreateRecordOpen}
        onClose={() => setIsCreateRecordOpen(false)}
      />
    </div>
  );
};
export default MyLogsPage;

