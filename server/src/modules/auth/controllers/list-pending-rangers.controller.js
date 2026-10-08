export function createListPendingRangersController(users) {
    return async function listPendingRangers(req, res) {
      const rangers = await users.findPendingRangers();
  
      res.status(200).json({
        rangers,
      });
    };
  }