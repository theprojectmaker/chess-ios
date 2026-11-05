import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BoardIcon, BoltIcon, ChartIcon, CheckIcon, FlameIcon, LockIcon, PathIcon, StarIcon } from '../components/Icons';
import { Piece } from '../components/Piece';
import { TeacherBubble, TeacherFace } from '../components/TeacherBubble';
import { Body, Card, ChunkyButton, Display, ProgressBar, Sheet, Stat } from '../components/ui';
import { ACHIEVEMENTS } from '../lib/achievements';
import { BOTS, getBot, type Bot } from '../lib/bots';
import { ALL_NODES, currentIndex, isDone, UNITS, type PathNode, type Unit } from '../lib/path';
import { getTeacher, pickLine, TEACHERS } from '../lib/teachers';
import { haptic, setSoundEnabled } from '../lib/sound';
import { DAILY_GOAL, dayKey, DEFAULT_PROGRESS, loadLocalGame, loadProgress, loadSavedGame, resetProgress, updateProgress, XP_PER_LEVEL, type Progress, type SavedGame, type SavedLocalGame } from '../lib/storage';
import { colors, fonts, MAX_CONTENT } from '../lib/theme';

type Tab = 'learn' | 'play' | 'me';
const ZIGZAG = [0, 46, 74, 46, 0, -46, -74, -46];
const NODE = 74;

export default function Home() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('learn');
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [saved, setSaved] = useState<SavedGame | null>(null);
  const [savedLocal, setSavedLocal] = useState<SavedLocalGame | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([loadProgress(), loadSavedGame(), loadLocalGame()]).then(([p, g, l]) => {
        if (!active) return;
        setProgress(p);
        setSaved(g);
        setSavedLocal(l);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TopBar progress={progress} />
      <View style={{ flex: 1 }}>
        {tab === 'learn' && <LearnTab progress={progress} />}
        {tab === 'play' && <PlayTab progress={progress} saved={saved} savedLocal={savedLocal} />}
        {tab === 'me' && <MeTab progress={progress} onChange={setProgress} />}
      </View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TabButton label="Learn" active={tab === 'learn'} onPress={() => setTab('learn')} icon={(c) => <PathIcon color={c} />} />
        <TabButton label="Play" active={tab === 'play'} onPress={() => setTab('play')} icon={(c) => <BoardIcon color={c} />} />
        <TabButton label="Progress" active={tab === 'me'} onPress={() => setTab('me')} icon={(c) => <ChartIcon color={c} />} />
      </View>
    </View>
  );
}

function TopBar({ progress }: { progress: Progress }) {
  const goal = Math.min(1, progress.dailyXp / DAILY_GOAL);
  return (
    <View style={styles.topBar}>
      <View style={styles.topInner}>
        <View style={styles.chip} accessibilityLabel={`${progress.streak} day streak`}>
          <FlameIcon size={24} muted={progress.streak === 0} />
          <Display size={18} color={progress.streak ? colors.flame : colors.faint}>{progress.streak}</Display>
        </View>
        <View style={styles.goal}>
          <ProgressBar value={goal} color={colors.sun} height={14} />
          <Body size={12} bold style={{ marginLeft: 8 }}>{Math.min(progress.dailyXp, DAILY_GOAL)}/{DAILY_GOAL} XP</Body>
        </View>
        <View style={styles.chip} accessibilityLabel={`${progress.xp} XP`}>
          <BoltIcon size={22} />
          <Display size={18} color={colors.sunLip}>{progress.xp}</Display>
        </View>
      </View>
    </View>
  );
}

function TabButton({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon: (color: string) => React.ReactNode }) {
  const color = active ? colors.sky : colors.faint;
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={() => { haptic('light'); onPress(); }} style={styles.tabItem}>
      <View style={[styles.tabFace, active && { backgroundColor: colors.skyWash, borderColor: colors.sky }]}>
        {icon(color)}
        <Body size={12} bold color={color}>{label}</Body>
      </View>
    </Pressable>
  );
}

function LearnTab({ progress }: { progress: Progress }) {
  const router = useRouter();
  const [open, setOpen] = useState<{ node: PathNode; unit: Unit } | null>(null);
  const current = currentIndex(progress);
  const dailyDone = progress.lastDaily === dayKey();
  const [hello] = useState(() => pickLine(getTeacher(progress.teacher).hello));
  let index = -1;

  const start = () => {
    if (!open) return;
    const { node } = open;
    setOpen(null);
    if (node.kind === 'lesson') router.push({ pathname: '/lesson', params: { id: node.id } });
    else if (node.kind === 'teach') router.push({ pathname: '/teach', params: { id: node.id } });
    else router.push({ pathname: '/game', params: { level: String(node.level), color: 'r' } });
  };

  const openNode = open?.node;
  const openDone = openNode ? isDone(openNode, progress) : false;

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TeacherBubble teacher={getTeacher(progress.teacher)} text={hello} />
        <Card
          tint={dailyDone ? colors.leafWash : colors.skyWash}
          edge={dailyDone ? colors.leaf : colors.sky}
          style={styles.row}
          onPress={() => router.push({ pathname: '/lesson', params: { mode: 'daily' } })}
        >
          <View style={styles.rushIcon}>{dailyDone ? <CheckIcon size={30} color={colors.leaf} /> : <StarIcon size={32} />}</View>
          <View style={{ flex: 1 }}>
            <Display size={20}>Daily puzzle</Display>
            <Body color={colors.ink}>{dailyDone ? 'Solved today. Come back tomorrow.' : 'One new puzzle a day, worth 20 XP.'}</Body>
          </View>
        </Card>
        {UNITS.map((unit, u) => (
          <View key={unit.title} style={styles.unit}>
            <View style={[styles.unitBanner, { backgroundColor: unit.color, borderBottomColor: unit.lip }]}>
              <Body size={13} bold color="rgba(255,255,255,0.85)">Unit {u + 1}</Body>
              <Display size={22} color="#FFFFFF">{unit.title}</Display>
              <Body size={14} color="#FFFFFF">{unit.about}</Body>
            </View>
            <View style={styles.path}>
              {unit.nodes.map((node, i) => {
                index++;
                const state = node.kind === 'teach' ? (isDone(node, progress) ? 'done' : 'open') : index < current ? 'done' : index === current ? 'current' : 'locked';
                return (
                  <PathStep
                    key={node.id}
                    node={node}
                    unit={unit}
                    state={state}
                    offset={ZIGZAG[(i + u * 3) % ZIGZAG.length]}
                    accuracy={node.kind === 'lesson' ? progress.lessonsDone[node.id] : undefined}
                    beaten={node.kind === 'bot' ? !!progress.botsBeaten[node.level] : undefined}
                    onPress={() => setOpen({ node, unit })}
                  />
                );
              })}
            </View>
          </View>
        ))}
        {current >= ALL_NODES.length && (
          <Card style={{ alignItems: 'center', gap: 6 }} tint={colors.sunWash} edge={colors.sun}>
            <Display size={20}>Path complete</Display>
            <Body center>Replay any step above, or chase your best Rush score in Play.</Body>
          </Card>
        )}
      </ScrollView>

      <Sheet visible={!!open} onClose={() => setOpen(null)}>
        {openNode && (() => {
          const idx = ALL_NODES.indexOf(openNode);
          const locked = openNode.kind !== 'teach' && idx > current;
          return (
            <>
              <Display size={24}>{openNode.title}</Display>
              <Body size={16}>{openNode.about}</Body>
              {locked ? (
                <ChunkyButton label="Finish the earlier steps first" disabled />
              ) : (
                <ChunkyButton
                  label={openNode.kind === 'bot' ? `Play ${getBot(openNode.level).name}` : openDone ? 'Practice again' : openNode.kind === 'teach' ? 'Start with your teacher' : 'Start lesson'}
                  color={open!.unit.color}
                  lip={open!.unit.lip}
                  onPress={start}
                />
              )}
            </>
          );
        })()}
      </Sheet>
    </>
  );
}

function PathStep({ node, unit, state, offset, accuracy, beaten, onPress }: { node: PathNode; unit: Unit; state: 'done' | 'current' | 'locked' | 'open'; offset: number; accuracy?: number; beaten?: boolean; onPress: () => void }) {
  const face = state === 'locked' ? colors.line : unit.color;
  const lip = state === 'locked' ? colors.lineLip : unit.lip;
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state !== 'current') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, bob]);
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const perfect = state === 'done' && (accuracy === 100 || beaten);

  return (
    <View style={[styles.step, { transform: [{ translateX: offset }] }]}>
      {state === 'current' && (
        <Animated.View style={[styles.bubble, { transform: [{ translateY }] }]}>
          <Body size={14} bold color={unit.color}>{node.kind === 'bot' ? 'PLAY' : 'START'}</Body>
          <View style={styles.bubbleTail} />
        </Animated.View>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={`${node.title}, ${state}`} onPress={() => { haptic('light'); onPress(); }}>
        {({ pressed }) => (
          <View style={[styles.ring, state === 'current' && { borderColor: unit.color }]}>
            <View style={[styles.nodeLip, { backgroundColor: lip, paddingBottom: pressed ? 0 : 7, marginTop: pressed ? 7 : 0 }]}>
              <View style={[styles.nodeFace, { backgroundColor: face }]}>
                {state === 'locked' ? (
                  <LockIcon size={28} />
                ) : state === 'done' ? (
                  <CheckIcon size={36} />
                ) : (
                  <Piece type={node.piece} color="w" size={54} />
                )}
              </View>
            </View>
          </View>
        )}
      </Pressable>
      {perfect && <View style={styles.starBadge}><StarIcon size={20} /></View>}
    </View>
  );
}

function BotAvatar({ bot, size = 56 }: { bot: Bot; size?: number }) {
  return (
    <View style={{ width: size, height: size + 5, borderRadius: size / 2, backgroundColor: bot.lip }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bot.color, alignItems: 'center', justifyContent: 'center' }}>
        <Piece type={bot.piece} color="w" size={size * 0.78} />
      </View>
    </View>
  );
}

function PlayTab({ progress, saved, savedLocal }: { progress: Progress; saved: SavedGame | null; savedLocal: SavedLocalGame | null }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Bot | null>(null);
  const [color, setColor] = useState<'w' | 'r' | 'b'>('r');
  const savedBot = saved ? getBot(saved.level) : null;

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {saved && savedBot && (
          <Card tint={colors.skyWash} edge={colors.sky} style={styles.row} onPress={() => router.push({ pathname: '/game', params: { resume: '1', level: String(saved.level) } })}>
            <BotAvatar bot={savedBot} size={48} />
            <View style={{ flex: 1 }}>
              <Display size={18}>Continue your game</Display>
              <Body>Against {savedBot.name}, {Math.ceil(saved.moves.length / 2)} moves in</Body>
            </View>
          </Card>
        )}

        <Card tint={colors.sunWash} edge={colors.sun} style={styles.row} onPress={() => router.push({ pathname: '/lesson', params: { mode: 'rush' } })}>
          <View style={styles.rushIcon}><BoltIcon size={34} /></View>
          <View style={{ flex: 1 }}>
            <Display size={20}>Puzzle Rush</Display>
            <Body color={colors.ink}>Three mistakes and it ends. Best: {progress.rushBest}</Body>
          </View>
        </Card>

        <Card tint={colors.leafWash} edge={colors.leaf} style={styles.row} onPress={() => router.push({ pathname: '/local', params: savedLocal ? { resume: '1' } : {} })}>
          <View style={styles.rushIcon}>
            <View style={{ marginRight: -22 }}><Piece type="k" color="w" size={40} /></View>
            <Piece type="k" color="b" size={40} />
          </View>
          <View style={{ flex: 1 }}>
            <Display size={20}>{savedLocal ? 'Continue pass and play' : 'Pass and play'}</Display>
            <Body color={colors.ink}>{savedLocal ? `${Math.ceil(savedLocal.moves.length / 2)} moves in` : 'Two players on one device, no internet needed.'}</Body>
          </View>
        </Card>

        <Display size={22} style={{ marginTop: 10 }}>Choose an opponent</Display>
        {BOTS.map((bot) => (
          <Card key={bot.level} style={styles.row} onPress={() => setPicked(bot)}>
            <BotAvatar bot={bot} />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Display size={18}>{bot.name}</Display>
                <Body size={12} bold color={colors.faint}>LEVEL {bot.level}</Body>
              </View>
              <Body size={14}>{bot.blurb}</Body>
            </View>
            {!!progress.botsBeaten[bot.level] && <StarIcon size={26} />}
          </Card>
        ))}
      </ScrollView>

      <Sheet visible={!!picked} onClose={() => setPicked(null)}>
        {picked && (
          <>
            <View style={styles.row}>
              <BotAvatar bot={picked} size={64} />
              <View style={{ flex: 1 }}>
                <Display size={24}>{picked.name}</Display>
                <Body>{picked.blurb}</Body>
              </View>
            </View>
            <Body bold color={colors.ink} style={{ marginTop: 4 }}>Play as</Body>
            <View style={styles.colorRow}>
              {(['w', 'r', 'b'] as const).map((c) => (
                <Pressable key={c} accessibilityRole="radio" accessibilityState={{ selected: color === c }} accessibilityLabel={{ w: 'White', r: 'Random', b: 'Black' }[c]} onPress={() => setColor(c)} style={[styles.colorTile, color === c && { borderColor: colors.sky, backgroundColor: colors.skyWash }]}>
                  {c === 'r' ? (
                    <View style={styles.halfPieces}>
                      <View style={{ marginRight: -18 }}><Piece type="k" color="w" size={38} /></View>
                      <Piece type="k" color="b" size={38} />
                    </View>
                  ) : (
                    <Piece type="k" color={c} size={46} />
                  )}
                  <Body size={13} bold color={color === c ? colors.sky : colors.muted}>{{ w: 'White', r: 'Random', b: 'Black' }[c]}</Body>
                </Pressable>
              ))}
            </View>
            <ChunkyButton
              label="Start game"
              onPress={() => {
                const level = picked.level;
                setPicked(null);
                router.push({ pathname: '/game', params: { level: String(level), color } });
              }}
            />
          </>
        )}
      </Sheet>
    </>
  );
}

function MeTab({ progress, onChange }: { progress: Progress; onChange: (p: Progress) => void }) {
  const [confirm, setConfirm] = useState(false);
  const level = Math.floor(progress.xp / XP_PER_LEVEL) + 1;
  const into = progress.xp % XP_PER_LEVEL;
  const days: { key: string; label: string; active: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    days.push({ key, label: 'SMTWTFS'[d.getDay()], active: progress.activeDays.includes(key) });
  }
  const beaten = BOTS.filter((b) => progress.botsBeaten[b.level]).length;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Card>
        <View style={styles.nameRow}>
          <Display size={24}>Level {level}</Display>
          <Body bold>{into}/{XP_PER_LEVEL} XP</Body>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10 }}><ProgressBar value={into / XP_PER_LEVEL} color={colors.leaf} /></View>
      </Card>

      <Card>
        <View style={styles.nameRow}>
          <Display size={20}>{progress.streak} day streak</Display>
          <Body bold>Best {progress.longestStreak}</Body>
        </View>
        <View style={styles.week}>
          {days.map((d) => (
            <View key={d.key} style={styles.day}>
              <FlameIcon size={30} muted={!d.active} />
              <Body size={12} bold color={d.active ? colors.flame : colors.faint}>{d.label}</Body>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.statRow}>
        <Stat icon={<Piece type="k" color="w" size={30} />} value={String(progress.gamesPlayed)} label="Games" />
        <Stat icon={<StarIcon size={28} />} value={String(progress.gamesWon)} label="Wins" />
        <Stat icon={<Piece type="q" color="b" size={30} />} value={`${beaten}/${BOTS.length}`} label="Bots beaten" />
      </View>
      <View style={styles.statRow}>
        <Stat icon={<Piece type="n" color="w" size={30} />} value={String(progress.puzzlesSolved)} label="Puzzles" />
        <Stat icon={<BoltIcon size={28} />} value={String(progress.rushBest)} label="Rush best" />
        <Stat icon={<Piece type="p" color="b" size={30} />} value={`${progress.gamesDrawn}/${progress.gamesLost}`} label="Draws/losses" />
      </View>

      <Display size={20} style={{ marginTop: 6 }}>Your teacher</Display>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teachers}>
        {TEACHERS.map((t) => {
          const on = progress.teacher === t.id;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${t.name}. ${t.style}`}
              style={[styles.teacherCard, on && { borderColor: t.color, backgroundColor: colors.wash }]}
              onPress={async () => {
                haptic('light');
                onChange(await updateProgress((p) => ({ ...p, teacher: t.id })));
              }}
            >
              <TeacherFace teacher={t} size={58} mood={on ? 'wow' : 'happy'} />
              <Display size={15} center>{t.name}</Display>
              <Body size={12} center>{t.style}</Body>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={styles.nameRow}>
        <View style={{ flex: 1 }}>
          <Body bold color={colors.ink} size={16}>Coach me during games</Body>
          <Body size={13}>Grades each move right after you play it.</Body>
        </View>
        <Switch
          value={progress.coachOn}
          trackColor={{ true: colors.leaf, false: colors.line }}
          onValueChange={async (on) => onChange(await updateProgress((p) => ({ ...p, coachOn: on })))}
        />
      </Card>

      <Display size={20} style={{ marginTop: 6 }}>Badges {progress.earned.length}/{ACHIEVEMENTS.length}</Display>
      <View style={styles.badges}>
        {ACHIEVEMENTS.map((a) => {
          const got = progress.earned.includes(a.id);
          return (
            <View key={a.id} style={[styles.badge, got && { backgroundColor: colors.sunWash, borderColor: colors.sun }]} accessibilityLabel={`${a.name}, ${a.about}, ${got ? 'earned' : 'not earned yet'}`}>
              <StarIcon size={28} muted={!got} />
              <Body size={13} bold center color={got ? colors.ink : colors.muted}>{a.name}</Body>
              <Body size={11} center>{a.about}</Body>
            </View>
          );
        })}
      </View>

      <Card style={styles.nameRow}>
        <Body bold color={colors.ink} size={16}>Sound effects</Body>
        <Switch
          value={progress.sound}
          trackColor={{ true: colors.leaf, false: colors.line }}
          onValueChange={async (on) => {
            setSoundEnabled(on);
            onChange(await updateProgress((p) => ({ ...p, sound: on })));
          }}
        />
      </Card>

      <ChunkyButton label="Reset progress" outline textColor={colors.coral} onPress={() => setConfirm(true)} />

      <Sheet visible={confirm} onClose={() => setConfirm(false)}>
        <Display size={22}>Reset all progress?</Display>
        <Body size={16}>This clears your streak, XP and path. It can't be undone.</Body>
        <ChunkyButton
          label="Reset progress"
          color={colors.coral}
          lip={colors.coralLip}
          onPress={async () => {
            onChange(await resetProgress());
            setConfirm(false);
          }}
        />
        <ChunkyButton label="Keep my progress" outline onPress={() => setConfirm(false)} />
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  topBar: { borderBottomWidth: 2, borderBottomColor: colors.line, alignItems: 'center' },
  topInner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, width: '100%', maxWidth: MAX_CONTENT },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goal: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40, gap: 12, width: '100%', maxWidth: MAX_CONTENT, alignSelf: 'center' },
  unit: { marginBottom: 14 },
  unitBanner: { borderRadius: 18, padding: 16, borderBottomWidth: 6 },
  path: { alignItems: 'center', paddingTop: 26, paddingBottom: 10, gap: 18 },
  step: { alignItems: 'center' },
  ring: { width: NODE + 16, height: NODE + 18, borderRadius: (NODE + 18) / 2, borderWidth: 5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  nodeLip: { borderRadius: NODE / 2, width: NODE - 8 },
  nodeFace: { height: NODE - 12, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center' },
  bubble: { position: 'absolute', top: -30, zIndex: 5, backgroundColor: colors.page, borderWidth: 2, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 3, alignItems: 'center' },
  bubbleTail: { position: 'absolute', bottom: -7, width: 12, height: 12, backgroundColor: colors.page, borderRightWidth: 2, borderBottomWidth: 2, borderColor: colors.line, transform: [{ rotate: '45deg' }] },
  starBadge: { position: 'absolute', right: 0, top: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rushIcon: { flexDirection: 'row', width: 52, height: 52, borderRadius: 26, backgroundColor: colors.page, alignItems: 'center', justifyContent: 'center' },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorTile: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.line, borderRadius: 16 },
  halfPieces: { flexDirection: 'row', height: 46, alignItems: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  day: { alignItems: 'center', gap: 2 },
  statRow: { flexDirection: 'row', gap: 10 },
  teachers: { gap: 10, paddingVertical: 2 },
  teacherCard: { width: 132, alignItems: 'center', gap: 4, padding: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.line, borderRadius: 16 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '31.5%', flexGrow: 1, alignItems: 'center', gap: 2, padding: 8, borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderRadius: 14 },
  tabBar: { flexDirection: 'row', justifyContent: 'center', borderTopWidth: 2, borderTopColor: colors.line, paddingTop: 8, paddingHorizontal: 8, gap: 8 },
  tabItem: { flex: 1, maxWidth: 180 },
  tabFace: { alignItems: 'center', paddingVertical: 5, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
});
