import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Board } from '../components/Board';
import { BoardIcon, BoltIcon, ChartIcon, CheckIcon, FlameIcon, LockIcon, PathIcon, StarIcon } from '../components/Icons';
import { Piece } from '../components/Piece';
import { TeacherBubble, TeacherFace } from '../components/TeacherBubble';
import { Body, Card, ChunkyButton, Display, ProgressBar, Sheet, Stat } from '../components/ui';
import { ACHIEVEMENTS } from '../lib/achievements';
import { BOTS, getBot, type Bot } from '../lib/bots';
import { bandFor, nextBand, ratingStakes } from '../lib/elo';
import { ALL_NODES, currentIndex, isDone, isLocked, unitForRating, UNITS, type PathNode, type Unit } from '../lib/path';
import { getTeacher, pickLine, TEACHERS } from '../lib/teachers';
import { haptic, play, setSoundEnabled, setSoundStyle, SOUND_STYLES } from '../lib/sound';
import { CLOCKS, ENDGAMES, MODE_INFO, type GameMode } from '../lib/variants';
import { DAILY_GOAL, dayKey, DEFAULT_PROGRESS, loadLocalGame, loadProgress, loadSavedGame, resetProgress, updateProgress, XP_PER_LEVEL, type Progress, type SavedGame, type SavedLocalGame } from '../lib/storage';
import { colors, fonts, MAX_CONTENT, themed, applyBoardPrefs, applyTheme, BOARD_STYLES, isDarkTheme } from '../lib/theme';

type Tab = 'learn' | 'play' | 'me';
const ZIGZAG = [0, 46, 74, 46, 0, -46, -74, -46];
const NODE = 74;

export default function Home() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>(isDarkTheme() ? 'play' : 'learn');
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [saved, setSaved] = useState<SavedGame | null>(null);
  const [savedLocal, setSavedLocal] = useState<SavedLocalGame | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([loadProgress(), loadSavedGame(), loadLocalGame()]).then(([p, g, l]) => {
        if (!active) return;
        setProgress(p);
        setSaved(g);
        setSavedLocal(l);
        setLoaded(true);
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
      <Sheet visible={loaded && !progress.ratingSet} canDismiss={false}>
        <Display size={24}>How much chess do you know?</Display>
        <Body size={15}>This sets your starting Elo. It moves up and down as you play, like a real rating.</Body>
        {PLACEMENT.map((o) => (
          <Card
            key={o.rating}
            style={styles.placeRow}
            onPress={async () => {
              setProgress(await updateProgress((p) => ({ ...p, rating: o.rating, ratingPeak: o.rating, puzzleRating: o.rating, ratingHistory: [o.rating], ratingSet: true })));
            }}
          >
            <View style={{ flex: 1 }}>
              <Display size={17}>{o.name}</Display>
              <Body size={13}>{o.about}</Body>
            </View>
            <Display size={18} color={colors.muted}>{o.rating}</Display>
          </Card>
        ))}
      </Sheet>
    </View>
  );
}

const PLACEMENT = [
  { rating: 100, name: 'Brand new', about: 'I am still learning how the pieces move' },
  { rating: 400, name: 'I know the rules', about: 'I can play a game, but I lose pieces' },
  { rating: 800, name: 'I play sometimes', about: 'I know forks and basic checkmates' },
  { rating: 1200, name: 'Club player', about: 'I know openings and common tactics' },
  { rating: 1600, name: 'Strong player', about: 'I calculate and know key endgames' },
  { rating: 2000, name: 'Expert', about: 'I play in tournaments at a high level' },
];

function RatingGraph({ history }: { history: number[] }) {
  const [width, setWidth] = useState(0);
  const height = 70;
  const lo = Math.min(...history);
  const hi = Math.max(...history);
  const span = Math.max(hi - lo, 40);
  const x = (i: number) => 6 + (i / Math.max(history.length - 1, 1)) * (width - 12);
  const y = (r: number) => height - 6 - ((r - lo) / span) * (height - 12);
  return (
    <View accessibilityLabel={`Rating graph, from ${history[0]} to ${history[history.length - 1]}`} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height, marginTop: 10, borderRadius: 12, backgroundColor: colors.wash, overflow: 'hidden' }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Path d={history.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r).toFixed(1)}`).join('')} fill="none" stroke={colors.sky} strokeWidth={2} strokeLinejoin="round" />
          <Circle cx={x(history.length - 1)} cy={y(history[history.length - 1])} r={4.5} fill={colors.sky} stroke={colors.wash} strokeWidth={2} />
        </Svg>
      )}
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
        <View style={[styles.eloChip, { backgroundColor: bandFor(progress.rating).color }]} accessibilityLabel={`${progress.rating} Elo, ${bandFor(progress.rating).name}`}>
          <Display size={16} color="#FFFFFF">{progress.rating}</Display>
          <Body size={10} bold color="#FFFFFF">ELO</Body>
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
  const yourUnit = unitForRating(progress.rating);
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
              <View style={styles.unitTop}>
                <Body size={13} bold color="#FFFFFF">{`Unit ${u + 1}  ·  ${unit.elo[0]}-${unit.elo[1]} Elo`}</Body>
                {unit === yourUnit && <View style={styles.yourLevel}><Body size={11} bold color={unit.color}>YOUR LEVEL</Body></View>}
              </View>
              <Display size={22} color="#FFFFFF">{unit.title}</Display>
              <Body size={14} color="#FFFFFF">{unit.about}</Body>
            </View>
            <View style={styles.path}>
              {unit.nodes.map((node, i) => {
                index++;
                const state = isDone(node, progress) ? 'done' : isLocked(node, progress) ? 'locked' : index === current ? 'current' : 'open';
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
          const locked = isLocked(openNode, progress);
          return (
            <>
              <Display size={24}>{openNode.title}</Display>
              <Body size={16}>{openNode.about}</Body>
              {locked ? (
                <ChunkyButton label={`Reach ${open!.unit.elo[0]} Elo to open this`} disabled />
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

function ModeTile({ title, about, color, lip, icon, onPress }: { title: string; about: string; color: string; lip: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${about}`} onPress={() => { haptic('light'); onPress(); }} style={styles.modeWrap}>
      {({ pressed }) => (
        <View style={{ backgroundColor: lip, borderRadius: 18, paddingBottom: pressed ? 0 : 6, marginTop: pressed ? 6 : 0 }}>
          <View style={[styles.modeFace, { backgroundColor: color }]}>
            <View style={styles.modeIcon}>{icon}</View>
            <Display size={17} color="#FFFFFF">{title}</Display>
            <Body size={12} bold color="#FFFFFF">{about}</Body>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function PlayTab({ progress, saved, savedLocal }: { progress: Progress; saved: SavedGame | null; savedLocal: SavedLocalGame | null }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Bot | null>(null);
  const [color, setColor] = useState<'w' | 'r' | 'b'>('r');
  const [mode, setMode] = useState<GameMode>('standard');
  const [minutes, setMinutes] = useState(0);
  const [showEndgames, setShowEndgames] = useState(false);
  const savedBot = saved ? getBot(saved.level) : null;

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {saved && savedBot && (
          <Card tint={colors.skyWash} edge={colors.sky} style={styles.row} onPress={() => router.push({ pathname: '/game', params: { resume: '1', level: String(saved.level), gauntlet: saved.gauntlet ? '1' : '', endgame: saved.endgame ?? '' } })}>
            <BotAvatar bot={savedBot} size={48} />
            <View style={{ flex: 1 }}>
              <Display size={18}>Continue your game</Display>
              <Body>Against {savedBot.name}, {Math.ceil(saved.moves.length / 2)} moves in</Body>
            </View>
          </Card>
        )}

        <Card tint={colors.skyWash} edge={colors.sky} style={styles.row} onPress={() => router.push('/games')}>
          <View style={styles.rushIcon}><ChartIcon size={30} color={colors.sky} /></View>
          <View style={{ flex: 1 }}>
            <Display size={20}>Review your games</Display>
            <Body color={colors.ink}>Move grades, your mistakes to retry, and a coach.</Body>
          </View>
        </Card>

        <Display size={22} style={{ marginTop: 6 }}>Ways to play</Display>
        <View style={styles.modes}>
          <ModeTile title="Analysis Board" about="Explore any line with the engine" color="#5B7FF0" lip="#3F5FCC" icon={<Piece type="r" color="w" size={44} />} onPress={() => router.push('/analysis')} />
          <ModeTile title="Rated Puzzles" about={`Your puzzle Elo: ${progress.puzzleRating}`} color={colors.solid} lip={colors.solidLip} icon={<Piece type="p" color="w" size={44} />} onPress={() => router.push({ pathname: '/lesson', params: { mode: 'rated' } })} />
          <ModeTile title="Puzzle Rush" about={`3 mistakes and out. Best ${progress.rushBest}`} color="#D98A0B" lip="#A86600" icon={<Piece type="n" color="w" size={44} />} onPress={() => router.push({ pathname: '/lesson', params: { mode: 'rush' } })} />
          <ModeTile title="3 Minute Rush" about={`Beat the clock. Best ${progress.blitzBest}`} color={colors.coral} lip={colors.coralLip} icon={<FlameIcon size={38} />} onPress={() => router.push({ pathname: '/lesson', params: { mode: 'blitz' } })} />
          <ModeTile title="Bot Gauntlet" about={`Beat them in a row. Best ${progress.gauntletBest}/${BOTS.length}`} color={colors.grape} lip={colors.grapeLip} icon={<Piece type="q" color="w" size={44} />} onPress={() => router.push({ pathname: '/game', params: { level: '1', color: 'r', gauntlet: '1' } })} />
          <ModeTile title="Endgame Drills" about={`Win it for real. ${Object.keys(progress.endgamesDone).length}/${ENDGAMES.length} done`} color="#2FB5A8" lip="#1F8F84" icon={<Piece type="r" color="w" size={44} />} onPress={() => setShowEndgames(true)} />
          <ModeTile title="Square Sprint" about={`Name the squares. Best ${progress.sprintBest}`} color={colors.sky} lip={colors.skyLip} icon={<Piece type="b" color="w" size={44} />} onPress={() => router.push('/coords')} />
          <ModeTile title={savedLocal ? 'Continue 2 player' : 'Pass and Play'} about={savedLocal ? `${Math.ceil(savedLocal.moves.length / 2)} moves in` : 'Two players, one device'} color={colors.leaf} lip={colors.leafLip} icon={<Piece type="k" color="w" size={44} />} onPress={() => router.push({ pathname: '/local', params: savedLocal ? { resume: '1' } : {} })} />
        </View>

        <Display size={22} style={{ marginTop: 10 }}>Choose an opponent</Display>
        {BOTS.map((bot) => (
          <Card key={bot.level} style={styles.row} onPress={() => setPicked(bot)}>
            <BotAvatar bot={bot} />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Display size={18}>{bot.name}</Display>
                <Body size={13} bold color={Math.abs(bot.elo - progress.rating) <= 150 ? colors.sky : colors.faint}>{bot.elo} ELO</Body>
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
            {(() => {
              const s = ratingStakes(progress.rating, picked.elo, progress.ratedGames);
              return (
                <View style={styles.stakes} accessibilityLabel={`Win plus ${s.win}, draw ${s.draw}, loss ${s.loss}`}>
                  <Body bold color={colors.ink}>{picked.elo} Elo</Body>
                  <Body bold color={colors.leafLip}>Win {s.win >= 0 ? '+' : ''}{s.win}</Body>
                  <Body bold color={colors.muted}>Draw {s.draw >= 0 ? '+' : ''}{s.draw}</Body>
                  <Body bold color={colors.coral}>Loss {s.loss}</Body>
                </View>
              );
            })()}
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
            <Body bold color={colors.ink}>Game type</Body>
            <View style={styles.chipRow}>
              {(Object.keys(MODE_INFO) as GameMode[]).map((m) => (
                <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: mode === m }} accessibilityLabel={`${MODE_INFO[m].name}. ${MODE_INFO[m].about}`} onPress={() => setMode(m)} style={[styles.modeChip, mode === m && styles.modeChipOn]}>
                  <Body size={13} bold color={mode === m ? colors.sky : colors.muted}>{MODE_INFO[m].name}</Body>
                </Pressable>
              ))}
            </View>
            <Body size={13}>{MODE_INFO[mode].about}</Body>
            <Body bold color={colors.ink}>Clock</Body>
            <View style={styles.chipRow}>
              {CLOCKS.map((m) => (
                <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: minutes === m }} accessibilityLabel={m ? `${m} minutes each` : 'No clock'} onPress={() => setMinutes(m)} style={[styles.modeChip, minutes === m && styles.modeChipOn]}>
                  <Body size={13} bold color={minutes === m ? colors.sky : colors.muted}>{m ? `${m} min` : 'None'}</Body>
                </Pressable>
              ))}
            </View>
            <ChunkyButton
              label="Start game"
              onPress={() => {
                const level = picked.level;
                setPicked(null);
                router.push({ pathname: '/game', params: { level: String(level), color, mode, minutes: String(minutes) } });
              }}
            />
          </>
        )}
      </Sheet>

      <Sheet visible={showEndgames} onClose={() => setShowEndgames(false)}>
        <Display size={24}>Endgame drills</Display>
        <Body>You start with a won position against the strongest bot. Finish it off.</Body>
        {ENDGAMES.map((e) => (
          <Card
            key={e.id}
            style={styles.row}
            onPress={() => {
              setShowEndgames(false);
              router.push({ pathname: '/game', params: { endgame: e.id, color: 'w' } });
            }}
          >
            <StarIcon size={26} muted={!progress.endgamesDone[e.id]} />
            <Display size={17}>{e.name}</Display>
          </Card>
        ))}
      </Sheet>
    </>
  );
}

function MeTab({ progress, onChange }: { progress: Progress; onChange: (p: Progress) => void }) {
  const [confirm, setConfirm] = useState(false);
  const level = Math.floor(progress.xp / XP_PER_LEVEL) + 1;
  const setBoard = async (change: Partial<Progress>) => {
    const next = await updateProgress((p) => ({ ...p, ...change }));
    applyBoardPrefs(next);
    onChange(next);
  };
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
          <View>
            <Display size={38} color={bandFor(progress.rating).color}>{progress.rating}</Display>
            <Body bold>{bandFor(progress.rating).name}</Body>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Body bold>Peak {progress.ratingPeak}</Body>
            <Body bold>Puzzles {progress.puzzleRating}</Body>
            <Body bold>{progress.ratedGames} rated games</Body>
          </View>
        </View>
        {nextBand(progress.rating) && (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <ProgressBar value={(progress.rating - bandFor(progress.rating).from) / (nextBand(progress.rating)!.from - bandFor(progress.rating).from)} color={bandFor(progress.rating).color} height={12} />
            </View>
            <Body size={12} bold>{nextBand(progress.rating)!.from - progress.rating} Elo to {nextBand(progress.rating)!.name}</Body>
          </View>
        )}
        {progress.ratingHistory.length >= 2 && <RatingGraph history={progress.ratingHistory} />}
      </Card>

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

      <Display size={20} style={{ marginTop: 6 }}>App theme</Display>
      <View style={styles.styleRow}>
        {([['buddy', 'Buddy', 'Bright, chunky and playful'], ['club', 'Chess Club', 'Dark, flat, classic green board']] as const).map(([id, name, about]) => {
          const on = progress.appTheme === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${name}. ${about}`}
              style={[styles.styleCard, on && { borderColor: colors.leaf }]}
              onPress={async () => {
                const next = await updateProgress((p) => ({ ...p, appTheme: id, boardStyle: id === 'club' ? 'club' : 'buddy', pieceStyle: id === 'club' ? 'flat' : 'chunky' }));
                applyBoardPrefs(next);
                applyTheme(id);
              }}
            >
              <Display size={15} center>{name}</Display>
              <Body size={12} center>{about}</Body>
            </Pressable>
          );
        })}
      </View>

      <Display size={20} style={{ marginTop: 6 }}>Board</Display>
      <View style={{ alignItems: 'center' }}>
        <Board key={`${progress.boardStyle}-${progress.pieceStyle}-${progress.showCoords}`} fen="r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 3" size={200} lastMove={['g1', 'f3']} />
      </View>
      <View style={styles.swatches}>
        {BOARD_STYLES.map((b) => {
          const on = progress.boardStyle === b.id;
          return (
            <Pressable key={b.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${b.name} board`} style={[styles.swatch, on && { borderColor: colors.leaf }]} onPress={() => setBoard({ boardStyle: b.id })}>
              <View style={styles.swatchSquares}>
                <View style={{ flex: 1, backgroundColor: b.light }} />
                <View style={{ flex: 1, backgroundColor: b.dark }} />
              </View>
              <Body size={11} bold center>{b.name}</Body>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.styleRow}>
        {([['chunky', 'Chunky pieces'], ['flat', 'Flat pieces']] as const).map(([id, name]) => (
          <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: progress.pieceStyle === id }} accessibilityLabel={name} style={[styles.styleCard, progress.pieceStyle === id && { borderColor: colors.leaf }]} onPress={() => setBoard({ pieceStyle: id })}>
            <Display size={15} center>{name}</Display>
          </Pressable>
        ))}
      </View>
      {([['showHints', 'Show legal moves'], ['showCoords', 'Show coordinates'], ['autoQueen', 'Always promote to queen']] as const).map(([key, name]) => (
        <Card key={key} style={styles.nameRow}>
          <Body bold color={colors.ink} size={16}>{name}</Body>
          <Switch value={progress[key]} trackColor={{ true: colors.leaf, false: colors.line }} onValueChange={(on) => setBoard({ [key]: on })} />
        </Card>
      ))}

      <Display size={20} style={{ marginTop: 6 }}>Sound style</Display>
      <View style={styles.styleRow}>
        {SOUND_STYLES.map((st) => {
          const on = progress.soundStyle === st.id;
          return (
            <Pressable
              key={st.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${st.name}. ${st.about}`}
              style={[styles.styleCard, on && { borderColor: colors.sky, backgroundColor: colors.skyWash }]}
              onPress={async () => {
                setSoundStyle(st.id);
                onChange(await updateProgress((p) => ({ ...p, soundStyle: st.id })));
                play('move');
                setTimeout(() => play('capture'), 260);
                setTimeout(() => play('correct'), 560);
              }}
            >
              <Display size={15} center>{st.name}</Display>
              <Body size={12} center>{st.about}</Body>
            </Pressable>
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

const styles = themed(() => ({
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
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: '22.5%', flexGrow: 1, padding: 6, gap: 4, borderWidth: 2, borderColor: colors.line, borderRadius: 12 },
  swatchSquares: { flexDirection: 'row', height: 34, borderRadius: 6, overflow: 'hidden' },
  eloChip: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, minWidth: 48 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  unitTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  yourLevel: { backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 1, borderRadius: 8 },
  stakes: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.wash, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeWrap: { width: '48%', flexGrow: 1 },
  modeFace: { borderRadius: 18, padding: 12, minHeight: 124, gap: 2 },
  modeIcon: { height: 46, justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modeChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderRadius: 12 },
  modeChipOn: { borderColor: colors.sky, backgroundColor: colors.skyWash },
  styleRow: { flexDirection: 'row', gap: 8 },
  styleCard: { flex: 1, alignItems: 'center', gap: 2, padding: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.line, borderRadius: 14 },
  teachers: { gap: 10, paddingVertical: 2 },
  teacherCard: { width: 132, alignItems: 'center', gap: 4, padding: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.line, borderRadius: 16 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '31.5%', flexGrow: 1, alignItems: 'center', gap: 2, padding: 8, borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderRadius: 14 },
  tabBar: { flexDirection: 'row', justifyContent: 'center', borderTopWidth: 2, borderTopColor: colors.line, paddingTop: 8, paddingHorizontal: 8, gap: 8 },
  tabItem: { flex: 1, maxWidth: 180 },
  tabFace: { alignItems: 'center', paddingVertical: 5, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
}));
