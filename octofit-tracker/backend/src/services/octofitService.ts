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
  return [];
}

export async function suggestWorkouts(_userEmail: string) {
  return Workout.find().limit(1).lean();
}

export { User };
