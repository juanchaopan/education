import { railChaseLesson } from '@education/problems/lessons/rail-chase';
import { narratedScript } from '../lesson-script';
import catchAhead from './assets/catch-ahead.mp3';
import catchGround from './assets/catch-ground.mp3';
import catchMeet from './assets/catch-meet.mp3';
import catchPush from './assets/catch-push.mp3';
import checkFourteen from './assets/check-fourteen.mp3';
import checkGround from './assets/check-ground.mp3';
import checkSix from './assets/check-six.mp3';
import checkTwo from './assets/check-two.mp3';
import distanceAbs from './assets/distance-abs.mp3';
import distanceAgain from './assets/distance-again.mp3';
import distanceCheck from './assets/distance-check.mp3';
import distanceGround from './assets/distance-ground.mp3';
import distancePush from './assets/distance-push.mp3';
import equationAsk from './assets/equation-ask.mp3';
import equationGround from './assets/equation-ground.mp3';
import equationSet from './assets/equation-set.mp3';
import fourteenGround from './assets/fourteen-ground.mp3';
import nameAsk from './assets/name-ask.mp3';
import nameCheck from './assets/name-check.mp3';
import nameGround from './assets/name-ground.mp3';
import nameRest from './assets/name-rest.mp3';
import nameT from './assets/name-t.mp3';
import oneCompare from './assets/one-compare.mp3';
import oneGold from './assets/one-gold.mp3';
import oneGround from './assets/one-ground.mp3';
import oneGuess from './assets/one-guess.mp3';
import oneStop from './assets/one-stop.mp3';
import pastGround from './assets/past-ground.mp3';
import pastMinus from './assets/past-minus.mp3';
import pastPassed from './assets/past-passed.mp3';
import pastSign from './assets/past-sign.mp3';
import pastWhy from './assets/past-why.mp3';
import questionAsk from './assets/question-ask.mp3';
import questionFour from './assets/question-four.mp3';
import questionGround from './assets/question-ground.mp3';
import questionPoints from './assets/question-points.mp3';
import questionSteps from './assets/question-steps.mp3';
import solveAsk from './assets/solve-ask.mp3';
import solveGround from './assets/solve-ground.mp3';
import speedBlue from './assets/speed-blue.mp3';
import speedBoth from './assets/speed-both.mp3';
import speedIntro from './assets/speed-intro.mp3';
import speedYellow from './assets/speed-yellow.mp3';
import startAsk from './assets/start-ask.mp3';
import startCount from './assets/start-count.mp3';
import startGround from './assets/start-ground.mp3';
import startKeep from './assets/start-keep.mp3';
import storyCars from './assets/story-cars.mp3';
import storyStart from './assets/story-start.mp3';
import storyWorkshop from './assets/story-workshop.mp3';
import threeGround from './assets/three-ground.mp3';
import threeStop from './assets/three-stop.mp3';
import threeThink from './assets/three-think.mp3';
import twoAsk from './assets/two-ask.mp3';
import twoGround from './assets/two-ground.mp3';
import twoStop from './assets/two-stop.mp3';
import varyGround from './assets/vary-ground.mp3';
import varyGuess from './assets/vary-guess.mp3';
import varyOn from './assets/vary-on.mp3';
import varyReveal from './assets/vary-reveal.mp3';
import varyStop from './assets/vary-stop.mp3';
import varyStopAgain from './assets/vary-stop-again.mp3';
import varyWhy from './assets/vary-why.mp3';
import waysAsk from './assets/ways-ask.mp3';
import waysBlue from './assets/ways-blue.mp3';
import waysGround from './assets/ways-ground.mp3';
import waysYellow from './assets/ways-yellow.mp3';

// The owl's lines, each with its recorded narration, the scenes in teaching
// order and what the owl says on arriving at each. The words and scenes are
// the lesson's content in @education/problems; the text is shown as the
// caption while a line plays and stays readable when the sound cannot play.
// Each scene is a step of the problem: its id is what a draft saves, what a
// question is asked about and what speech recognition is told to expect.
export const { lines, shots, entryLines } = narratedScript(railChaseLesson, {
  storyWorkshop,
  storyCars,
  storyStart,
  speedIntro,
  speedYellow,
  speedBlue,
  speedBoth,
  questionGround,
  questionPoints,
  questionAsk,
  questionFour,
  questionSteps,
  startGround,
  startAsk,
  startCount,
  startKeep,
  oneGround,
  oneGuess,
  oneStop,
  oneCompare,
  oneGold,
  twoGround,
  twoAsk,
  twoStop,
  threeGround,
  threeThink,
  threeStop,
  nameGround,
  nameT,
  nameAsk,
  nameRest,
  nameCheck,
  catchGround,
  catchPush,
  catchMeet,
  catchAhead,
  pastGround,
  pastPassed,
  pastMinus,
  pastWhy,
  pastSign,
  distanceGround,
  distancePush,
  distanceAgain,
  distanceAbs,
  distanceCheck,
  equationGround,
  equationAsk,
  equationSet,
  waysGround,
  waysAsk,
  waysBlue,
  waysYellow,
  solveGround,
  solveAsk,
  checkGround,
  checkSix,
  fourteenGround,
  checkFourteen,
  checkTwo,
  varyGround,
  varyGuess,
  varyStop,
  varyOn,
  varyStopAgain,
  varyWhy,
  varyReveal,
});

export type LineId = keyof typeof lines;
export type Shot = (typeof shots)[number];
