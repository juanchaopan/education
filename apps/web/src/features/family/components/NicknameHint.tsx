import { childNicknameLength, nicknameCharacters } from '@education/contracts';

// The hint under a new nickname: that it need not be a real name, and how
// many characters it has of the most it may have, counted as the server
// counts them. Which characters it may hold is checked when the form is sent.
export function NicknameHint({ nickname }: { nickname: string }) {
  const length = nicknameCharacters(nickname);
  if (length > childNicknameLength) return <>不用真名 · 多了 {length - childNicknameLength} 个字</>;
  return (
    <>
      不用真名 · {length} / {childNicknameLength}
    </>
  );
}
