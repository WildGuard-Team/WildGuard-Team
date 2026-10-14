export async function listRangers(users) {
  const rangers = await users.findRangers();

  return rangers.map((ranger) => ({
    _id: ranger._id,
    fullName: ranger.fullName,
    email: ranger.email,
    rangerId: ranger.rangerId,
    assignedPark: ranger.assignedPark,
    approvalStatus: ranger.approvalStatus,
    createdAt: ranger.createdAt,
  }));
}
