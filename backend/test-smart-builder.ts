import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate long content - about 2000 words to force multiple pages
const longContent = `
Introduction to Cloud Computing

Cloud computing has revolutionized the way businesses operate in the digital age. It provides on-demand access to computing resources including servers, storage, databases, networking, software, analytics, and intelligence over the Internet. Organizations of all sizes are adopting cloud technologies to reduce costs, increase agility, and drive innovation.

The fundamental concept behind cloud computing is the delivery of computing services over the internet, allowing users to access technology resources without the need to own and maintain physical infrastructure. This paradigm shift has enabled businesses to scale operations rapidly, respond to market changes quickly, and focus on core competencies rather than IT management.

Cloud computing operates on a pay-as-you-go model, where users pay only for the resources they consume. This eliminates the need for large upfront capital investments in hardware and reduces ongoing operational expenses. The elasticity of cloud resources means that capacity can be increased or decreased based on demand, ensuring optimal resource utilization and cost efficiency.

Types of Cloud Services

Cloud services are typically categorized into three main models: Infrastructure as a Service (IaaS), Platform as a Service (PaaS), and Software as a Service (SaaS). Each model offers different levels of control, flexibility, and management responsibilities.

Infrastructure as a Service provides virtualized computing resources over the internet. Users can rent virtual machines, storage, and networks on demand. This model offers the greatest flexibility and control, allowing organizations to build custom solutions while eliminating the need to purchase and maintain physical hardware. Major IaaS providers include Amazon Web Services, Microsoft Azure, and Google Cloud Platform.

Platform as a Service offers a complete development and deployment environment in the cloud. It provides resources that enable developers to build, test, and deploy applications without worrying about underlying infrastructure. PaaS includes development tools, database management systems, business analytics, and operating systems. This model accelerates development cycles and reduces complexity.

Software as a Service delivers applications over the internet on a subscription basis. Users access software through web browsers without installing or maintaining applications locally. SaaS eliminates concerns about software updates, patches, and compatibility issues. Common examples include email services, customer relationship management systems, and productivity suites.

Cloud Deployment Models

Organizations can choose from several cloud deployment models based on their security, compliance, and business requirements. The four primary deployment models are public cloud, private cloud, hybrid cloud, and multi-cloud.

Public cloud services are provided by third-party vendors over the public internet and shared among multiple organizations. This model offers the highest level of efficiency and cost-effectiveness but provides less control over data and infrastructure. Public clouds are ideal for applications with fluctuating demand and for organizations seeking to minimize IT investment.

Private cloud infrastructure is dedicated to a single organization and can be hosted on-premises or by a third-party provider. This model offers greater control, customization, and security, making it suitable for organizations with strict regulatory requirements or sensitive data. However, private clouds require significant investment and ongoing management.

Hybrid cloud combines public and private cloud environments, allowing data and applications to move between them. This model provides flexibility, enabling organizations to keep sensitive workloads in private clouds while leveraging public cloud resources for less critical operations. Hybrid clouds offer the benefits of both deployment models and support diverse business needs.

Multi-cloud strategies involve using services from multiple cloud providers to avoid vendor lock-in, optimize costs, and leverage best-of-breed solutions. Organizations can select specific services from different providers based on performance, features, and pricing. However, multi-cloud environments add complexity to management and integration.

Security and Compliance

Security remains a primary concern for organizations adopting cloud computing. Cloud providers implement robust security measures including encryption, access controls, and monitoring systems. However, security is a shared responsibility between providers and customers. Organizations must implement proper security practices, including strong authentication, data encryption, and regular audits.

Compliance with industry regulations and standards is crucial for many organizations. Cloud providers offer compliance certifications for various frameworks including HIPAA, GDPR, SOC 2, and ISO 27001. Organizations must ensure that their cloud deployment meets all applicable regulatory requirements and industry standards.

Data protection and privacy are critical considerations in cloud computing. Organizations must understand where their data is stored, how it is processed, and who has access to it. Data residency requirements may restrict where data can be physically located, affecting cloud provider selection and deployment strategies.

Benefits and Challenges

Cloud computing offers numerous benefits including cost savings, scalability, flexibility, disaster recovery, and automatic updates. Organizations can rapidly deploy new services, experiment with technologies, and scale resources based on demand. The cloud enables remote work, global collaboration, and business continuity.

However, cloud adoption also presents challenges. Network dependence means that internet connectivity is critical for accessing cloud services. Performance can be affected by network latency and bandwidth limitations. Organizations must carefully plan migration strategies, manage vendor relationships, and develop cloud governance frameworks.

Cost management in the cloud requires careful monitoring and optimization. While the pay-as-you-go model can reduce costs, poorly managed cloud resources can lead to unexpected expenses. Organizations need tools and processes to track usage, identify waste, and optimize spending.

Future Trends

The future of cloud computing includes emerging technologies such as edge computing, serverless architecture, artificial intelligence integration, and quantum computing. Edge computing brings computation and data storage closer to data sources, reducing latency and bandwidth usage. Serverless architecture allows developers to build applications without managing servers.

Artificial intelligence and machine learning services are becoming integral parts of cloud platforms, enabling organizations to leverage advanced analytics and automation. Cloud providers are investing heavily in AI capabilities, making sophisticated technologies accessible to businesses of all sizes.

Sustainability is becoming increasingly important in cloud computing. Major providers are committing to carbon neutrality and renewable energy usage. Green cloud computing practices focus on energy efficiency, resource optimization, and environmental responsibility.
`.trim();

async function testSmartBuilder() {
  try {
    console.log('\n🧪 Testing Smart PDF Builder with long content...\n');
    console.log(`Content length: ${longContent.split(/\s+/).length} words\n`);
    
    // Call the Smart Builder API endpoint
    const response = await fetch('http://localhost:3001/api/pdf-studio/smart-builder/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawContent: longContent,
        config: {
          documentType: 'business_plan',
          includeCoverPage: true,
          includeTableOfContents: true,
          generateIntro: true,
          generateSummary: true,
          generateConclusion: true,
          layoutType: 'single-column',
          visualStyle: 'professional',
        }
      })
    });
    
    const result = await response.json();
    
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Document generated successfully!\n');
      const docId = result.data.document.id;
      
      // Query the database to see actual pages
      const doc = await prisma.pdfDocument.findUnique({
        where: { id: docId },
        include: {
          pages: {
            orderBy: { order: 'asc' }
          }
        }
      });
      
      if (doc) {
        console.log(`📄 Document: "${doc.title}"`);
        console.log(`   Type: ${doc.documentType}`);
        console.log(`   Total Pages: ${doc.pages.length}\n`);
        
        let totalWords = 0;
        doc.pages.forEach((page, idx) => {
          const content = typeof page.content === 'object' && page.content !== null 
            ? (page.content as any).text || ''
            : String(page.content);
          const words = content.split(/\s+/).filter((w: string) => w.trim()).length;
          totalWords += words;
          
          console.log(`   Page ${idx + 1}: "${page.title}"`);
          console.log(`      Type: ${page.pageType}, Words: ${words}`);
          console.log(`      Preview: ${content.substring(0, 100)}...\n`);
        });
        
        console.log(`\n📊 Summary:`);
        console.log(`   Total pages: ${doc.pages.length}`);
        console.log(`   Total words: ${totalWords}`);
        console.log(`   Average words/page: ${Math.round(totalWords / doc.pages.length)}`);
        console.log(`\n${totalWords > 500 ? '✅ SUCCESS' : '❌ FAILED'} - Content properly distributed!`);
      }
    } else {
      console.log('❌ Failed to generate document:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSmartBuilder();
