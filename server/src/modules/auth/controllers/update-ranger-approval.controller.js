import {
    updateRangerApproval,
  } from '../services/update-ranger-approval.service.js';
  
  export function createUpdateRangerApprovalController(users) {
    return async function updateApproval(req, res) {
      const ranger =
        await updateRangerApproval(
          req.params.userId,
          req.body?.status,
          users,
        );
  
      res.status(200).json({
        ranger,
        message:
          ranger.approvalStatus === 'APPROVED'
            ? 'Ranger account approved successfully.'
            : 'Ranger account rejected.',
      });
    };
  }