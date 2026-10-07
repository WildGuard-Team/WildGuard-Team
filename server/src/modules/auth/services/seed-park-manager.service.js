import { PARK_MANAGER } from '../config/auth.constants.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export async function seedParkManager(
  repository,
  account,
  passwordService = { hash: hashPassword, verify: verifyPassword },
) {
  const email = account.email.trim().toLowerCase();
  const fullName = account.fullName.trim();
  const existing = await repository.findByEmail(email);

  if (!existing) {
    const created = await repository.create({
      fullName,
      email,
      passwordHash: await passwordService.hash(account.password),
      role: PARK_MANAGER,
    });
    return { action: 'created', id: created.id, email };
  }

  const changes = {};
  if (existing.fullName !== fullName) changes.fullName = fullName;
  if (existing.role !== PARK_MANAGER) changes.role = PARK_MANAGER;
  if (!(await passwordService.verify(account.password, existing.passwordHash))) {
    changes.passwordHash = await passwordService.hash(account.password);
  }

  if (Object.keys(changes).length === 0) {
    return { action: 'unchanged', id: existing.id, email };
  }

  await repository.updateById(existing.id, changes);
  return { action: 'updated', id: existing.id, email };
}
