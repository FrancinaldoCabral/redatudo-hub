import { Request, Response } from 'express';
import { CreditsService } from '../../services/credits.service';
import { errorToText } from '../../services/axios-errors.service';

const creditsService = new CreditsService();

export const addSubscriptionCredits = async (req: Request, res: Response) => {
    try {
        const { userId, token } = req.body;
        if (!userId || !token) {
            res.status(400).json({ msg: 'UserId and token are required' });
            return;
        }
        const balance = await creditsService.addSubscriptionCredits(userId, token);
        res.status(200).json({ balance });
    } catch (error) {
        res.status(500).json({ msg: errorToText(error) });
    }
};

export const addAdditionalCredits = async (req: Request, res: Response) => {
    try {
        const { userId, token, productId } = req.body;
        if (!userId || !token || !productId) {
            res.status(400).json({ msg: 'UserId, token, and productId are required' });
            return;
        }
        const balance = await creditsService.addAdditionalCredits(userId, token, productId);
        res.status(200).json({ balance });
    } catch (error) {
        res.status(500).json({ msg: errorToText(error) });
    }
};
