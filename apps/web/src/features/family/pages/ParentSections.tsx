import { ParentSection } from '../components/ParentSection';
import { AiConsentPanel } from './AiConsentPanel';
import { ChildAccessPanel } from './ChildAccessPanel';
import { FamilyCodeCardPanel } from './FamilyCodePanel';
import { FamilyDeletionPanel } from './FamilyDeletionPanel';
import { FamilyExportPanel } from './FamilyExportPanel';
import { LearningSummaryPanel } from './LearningSummaryPanel';
import { RegistrationKeyPanel } from './RegistrationKeyPanel';
import { ShelfPage } from './ShelfPage';
import { TimeZonePanel } from './TimeZonePanel';

// The parts of the parent space past the overview. Their panels start over
// with each renewed session; export and deletion renew the session themselves
// and keep their state across it.

// The family's own page: its children, the code they sign in with, the KEY
// that lets a new child join, and the time zone its days are counted in.
export function ProfileSection({ csrf }: { csrf: string }) {
  return (
    <ParentSection titleId="profile-title" title="家庭">
      <ChildAccessPanel key={`children-${csrf}`} csrf={csrf} />
      <FamilyCodeCardPanel key={`code-${csrf}`} csrf={csrf} />
      <RegistrationKeyPanel key={csrf} csrf={csrf} />
      <TimeZonePanel key={`time-zone-${csrf}`} csrf={csrf} />
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
