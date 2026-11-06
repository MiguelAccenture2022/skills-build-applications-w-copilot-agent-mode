import { Activity, Team, User, Workout } from '../models/index.js';
import { Types } from 'mongoose';

function serviceError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw serviceError('Activity details are required', 400);
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' || !Types.ObjectId.isValid(userId) ||
    typeof teamId !== 'string' || !Types.ObjectId.isValid(teamId) ||
    typeof type !== 'string' || type.trim().length === 0 ||
    typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1
  ) {
    throw serviceError('Activity details are invalid', 400);
  }

  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!userExists || !teamExists) {
    throw serviceError('Activity user or team was not found', 404);
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw serviceError('Team details are required', 400);
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  if (
    typeof name !== 'string' || name.trim().length === 0 ||
    typeof mascot !== 'string' || mascot.trim().length === 0 ||
    (members !== undefined && (!Array.isArray(members) || !members.every((member) => typeof member === 'string' && Types.ObjectId.isValid(member))))
  ) {
    throw serviceError('Team details are invalid', 400);
  }

  const memberIds = [...new Set((members as string[] | undefined ?? []).map((memberId) => memberId.toLowerCase()))]
    .map((memberId) => new Types.ObjectId(memberId));
  const users = await User.find({ _id: { $in: memberIds } }).select('_id team').lean();
  if (users.length !== memberIds.length) {
    throw serviceError('One or more team members were not found', 404);
  }

  const previousTeamIds = [...new Set(users.flatMap((user) => user.team ? [user.team] : []))];
  if (previousTeamIds.length > 0) {
    await Team.updateMany(
      { _id: { $in: previousTeamIds } },
      { $pull: { members: { $in: memberIds } } },
      { runValidators: true },
    );
  }

  const team = await Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
  if (memberIds.length > 0) {
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } }, { runValidators: true });
  }
  return team;
}

export async function getLeaderboard() {
  const teams = await Team.aggregate([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $project: {
        teamName: '$name',
        totalPoints: { $sum: '$activities.points' },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return teams.map(({ teamName, totalPoints }, index) => ({
    teamName,
    totalPoints,
    rank: index + 1,
  }));
}

function focusFromActivity(type: string) {
  const activityType = type.trim().toLowerCase();
  if (['run', 'running', 'walk', 'walking', 'cycle', 'cycling'].includes(activityType)) return 'endurance';
  return activityType;
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) {
    throw serviceError('User was not found', 404);
  }

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const goalFocus = user.fitnessGoal.trim().toLowerCase();
  const recentFocus = recentActivity ? focusFromActivity(recentActivity.type) : undefined;

  return workouts
    .map((workout, index) => ({
      workout,
      index,
      score: Number(workout.focus.toLowerCase() === goalFocus) * 2 + Number(workout.focus.toLowerCase() === recentFocus),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ workout }) => {
      const workoutFocus = workout.focus.toLowerCase();
      const reason = workoutFocus === goalFocus && recentActivity
        ? `Supports your ${goalFocus} goal and builds on your recent ${recentActivity.type} activity.`
        : workoutFocus === goalFocus
          ? `Supports your ${goalFocus} goal.`
          : workoutFocus === recentFocus && recentActivity
            ? `Builds on your recent ${recentActivity.type} activity.`
            : `Suggested to complement your ${goalFocus} goal.`;
      return { ...workout, reason };
    });
}

export { User };
