import { Product } from "../constans";

const createNotificationTemplate = (item: Product) => {
    const formatCurrency = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    const formattedPrice = formatCurrency(item.price);
    return {
        default: JSON.stringify(item),
        SNS: JSON.stringify({
            subject: `New Product: ${item.title}`,
            message: `Price: ${formattedPrice}`
                + `\n\nDescription: ${item.description}`,
            topic: process.env.SNS_TOPIC_ARN
        })
    };
};

export default createNotificationTemplate;