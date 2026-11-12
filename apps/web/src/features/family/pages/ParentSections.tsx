import { ParentSection } from '../components/ParentSection';
import { AiConsentPanel } from './AiConsentPanel';
import { ChildAccessPanel } from './ChildAccessPanel';
import { FamilyDeletionPanel } from './FamilyDeletionPanel';
import { FamilyExportPanel } from './FamilyExportPanel';
import { LearningSummaryPanel } from './LearningSummaryPanel';
import { RegistrationKeyPanel } from './RegistrationKeyPanel';
import { ShelfPage } from './ShelfPage';

// The parts of the parent space past the overview. Their panels start over
// with each renewed session; export and deletion renew the session themselves
// and keep their state across it.

export function ChildrenSection({ csrf }: { csrf: string }) {
  return (
    <ParentSection titleId="children-title" title="孩子">
      <RegistrationKeyPanel key={csrf} csrf={csrf} />
      <ChildAccessPanel key={`children-${csrf}`} csrf={csrf} />
    </ParentSection>
  );
}

export function PracticeSection({ csrf }: { csrf: string }) {
  return (
    <ParentSection titleId="practice-title" title="练习安排">
      <ShelfPage key={`shelf-${csrf}`} csrf={csrf} />
    </ParentSection>
  );
}

export function LearningSection({ csrf }: { csrf: string }) {
  return (
    <ParentSection titleId="learning-title" title="学习记录">
      <LearningSummaryPanel key={`summary-${csrf}`} csrf={csrf} />
    </ParentSection>
  );
}

export function PrivacySection({ csrf, onDeleted }: { csrf: string; onDeleted: () => void }) {
  return (
    <ParentSection titleId="privacy-title" title="隐私与数据">
      <AiConsentPanel key={`ai-consent-${csrf}`} csrf={csrf} />
      <FamilyExportPanel csrf={csrf} />
      <FamilyDeletionPanel csrf={csrf} onDeleted={onDeleted} />
    </ParentSection>
  );
}
